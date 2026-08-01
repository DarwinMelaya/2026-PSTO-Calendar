import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import AddOrgChartModal from "../../components/Modals/AdminModals/AddOrgChartModal";
import Layout from "../../components/Layout/Layout";
import { getGreeting, PanelHeader, StatCard } from "../../components/User/UserWorkspaceUI";
import {
  autoLayoutPositions,
  createLineElement,
  createOrgChartEntry,
  createTextElement,
  deleteOrgChartEntry,
  ELEMENT_TYPES,
  listOrgChart,
  orthogonalConnectorPoints,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
  resolveLineEndpoints,
  saveElementGeometry,
  saveManyPositions,
  sideAnchors,
} from "../../utils/orgChart";

const GRID = 5;
const MIN_CANVAS_W = 1600;
const MIN_CANVAS_H = 1100;
const CANVAS_PADDING = 240;

const snap = (value) => Math.round(value / GRID) * GRID;

const bandClass = (type) =>
  type === "contractual"
    ? "bg-sky-400 text-slate-900"
    : "bg-amber-400 text-slate-900";

// ─── Person card ──────────────────────────────────────────────────────────────

const PhotoFrame = ({ entry }) => {
  const isVacant = (entry.name || "").trim().toUpperCase() === "VACANT";

  if (entry.photoUrl) {
    return (
      <img
        src={entry.photoUrl}
        alt={entry.name}
        draggable={false}
        className="h-40 w-full select-none bg-white object-cover object-top"
      />
    );
  }

  return (
    <div className="flex h-40 w-full items-center justify-center bg-white">
      {isVacant ? (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Vacant
        </span>
      ) : (
        <svg
          className="h-14 w-14 text-slate-200"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z" />
        </svg>
      )}
    </div>
  );
};

const PersonCard = ({ entry }) => (
  <div
    className="overflow-hidden rounded-sm border border-slate-300 bg-[#f8f7f3] shadow-sm"
    style={{ width: PERSON_CARD_WIDTH }}
  >
    <PhotoFrame entry={entry} />

    <p className="border-t border-slate-200 px-2 py-1.5 text-center text-[11px] font-bold uppercase leading-tight tracking-tight text-slate-900">
      {entry.name}
    </p>

    <p
      className={`px-2 py-1 text-center text-[10px] font-bold leading-tight ${bandClass(entry.employmentType)}`}
    >
      {entry.position}
    </p>

    {entry.responsibilities ? (
      <p className="px-2 py-1.5 text-[9px] leading-snug text-slate-600">
        {entry.responsibilities}
      </p>
    ) : null}
  </div>
);

// ─── Canvas page ──────────────────────────────────────────────────────────────

const AddOrgChart = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [zoom, setZoom] = useState(0.85);
  const [sizes, setSizes] = useState({});
  const [dragging, setDragging] = useState(false);
  const [connectDraft, setConnectDraft] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasMode, setCanvasMode] = useState("view");
  const [branchMode, setBranchMode] = useState(false);
  const [branchSourceId, setBranchSourceId] = useState(null);
  const [newLineHasArrow, setNewLineHasArrow] = useState(false);
  const [addPosition, setAddPosition] = useState(null);

  const isViewMode = canvasMode === "view";
  const isEditMode = canvasMode === "edit";

  const dragRef = useRef(null);
  const connectRef = useRef(null);
  const zoomRef = useRef(zoom);
  const cardRefs = useRef(new Map());
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !editingTextId && !modalOpen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen, editingTextId, modalOpen]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listOrgChart();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries(data ?? []);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Existing rows created before the canvas existed get tidy coordinates once.
  useEffect(() => {
    const missing = entries.filter(
      (e) =>
        e.elementType === ELEMENT_TYPES.PERSON &&
        (e.posX == null || e.posY == null),
    );
    if (missing.length === 0) return;

    const layout = autoLayoutPositions(entries);
    const patch = layout.filter((item) =>
      missing.some((m) => String(m.id) === String(item.id)),
    );
    if (patch.length === 0) return;

    const byId = new Map(patch.map((p) => [String(p.id), p]));
    setEntries((prev) =>
      prev.map((entry) => {
        const found = byId.get(String(entry.id));
        return found ? { ...entry, posX: found.posX, posY: found.posY } : entry;
      }),
    );
    saveManyPositions(patch);
  }, [entries]);

  useLayoutEffect(() => {
    const next = {};
    cardRefs.current.forEach((node, id) => {
      if (node) next[id] = { w: node.offsetWidth, h: node.offsetHeight };
    });
    setSizes(next);
  }, [entries, loading]);

  const people = useMemo(
    () => entries.filter((e) => e.elementType === ELEMENT_TYPES.PERSON),
    [entries],
  );
  const texts = useMemo(
    () => entries.filter((e) => e.elementType === ELEMENT_TYPES.TEXT),
    [entries],
  );
  const lines = useMemo(
    () => entries.filter((e) => e.elementType === ELEMENT_TYPES.LINE),
    [entries],
  );
  const selectedLine = useMemo(
    () => lines.find((line) => String(line.id) === String(selectedId)) ?? null,
    [lines, selectedId],
  );
  const selectedElement = useMemo(
    () =>
      entries.find((entry) => String(entry.id) === String(selectedId)) ?? null,
    [entries, selectedId],
  );

  const canvasSize = useMemo(() => {
    let maxX = MIN_CANVAS_W;
    let maxY = MIN_CANVAS_H;

    for (const entry of entries) {
      const size = sizes[String(entry.id)];
      const right =
        (entry.posX ?? 0) +
        Math.max(entry.width ?? 0, size?.w ?? PERSON_CARD_WIDTH);
      const bottom =
        (entry.posY ?? 0) +
        Math.max(entry.height ?? 0, size?.h ?? PERSON_CARD_HEIGHT);
      maxX = Math.max(maxX, right + CANVAS_PADDING);
      maxY = Math.max(maxY, bottom + CANVAS_PADDING);
    }

    return { width: maxX, height: maxY };
  }, [entries, sizes]);

  /** Card rectangles in canvas coordinates — used for docking connectors. */
  const rectById = useMemo(() => {
    const map = new Map();
    for (const person of people) {
      const size = sizes[String(person.id)];
      map.set(String(person.id), {
        x: person.posX ?? 0,
        y: person.posY ?? 0,
        w: size?.w ?? PERSON_CARD_WIDTH,
        h: size?.h ?? PERSON_CARD_HEIGHT,
      });
    }
    return map;
  }, [people, sizes]);

  const pointInCanvas = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const scale = zoomRef.current || 1;
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }, []);

  const cardAtPoint = useCallback(
    (point) => {
      for (const [id, rect] of rectById) {
        if (
          point.x >= rect.x &&
          point.x <= rect.x + rect.w &&
          point.y >= rect.y &&
          point.y <= rect.y + rect.h
        ) {
          return id;
        }
      }
      return null;
    },
    [rectById],
  );

  const connectors = useMemo(() => {
    const byId = new Map(people.map((p) => [String(p.id), p]));

    return people
      .filter((child) => child.parentId != null && byId.has(String(child.parentId)))
      .map((child) => {
        const parent = byId.get(String(child.parentId));
        const parentSize = sizes[String(parent.id)] ?? {
          w: PERSON_CARD_WIDTH,
          h: PERSON_CARD_HEIGHT,
        };
        const childSize = sizes[String(child.id)] ?? {
          w: PERSON_CARD_WIDTH,
          h: PERSON_CARD_HEIGHT,
        };

        const startX = (parent.posX ?? 0) + parentSize.w / 2;
        const startY = (parent.posY ?? 0) + parentSize.h;
        const endX = (child.posX ?? 0) + childSize.w / 2;
        const endY = child.posY ?? 0;
        const midY = startY + Math.max(20, (endY - startY) / 2);

        return {
          id: `${parent.id}-${child.id}`,
          points: `${startX},${startY} ${startX},${midY} ${endX},${midY} ${endX},${endY}`,
        };
      });
  }, [people, sizes]);

  // Kept in a ref so drag listeners never resubscribe mid-gesture.
  const helpersRef = useRef({ cardAtPoint, pointInCanvas, newLineHasArrow });
  useEffect(() => {
    helpersRef.current = { cardAtPoint, pointInCanvas, newLineHasArrow };
  }, [cardAtPoint, pointInCanvas, newLineHasArrow]);

  // ── Dragging ───────────────────────────────────────────────────────────────

  const beginDrag = (e, entry, mode) => {
    if (editingTextId === entry.id) return;
    e.stopPropagation();
    setSelectedId(entry.id);
    dragRef.current = {
      id: entry.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: {
        posX: entry.posX ?? 0,
        posY: entry.posY ?? 0,
        width: entry.width ?? 0,
        height: entry.height ?? 0,
      },
      latest: null,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const applyDelta = (e) => {
      const drag = dragRef.current;
      if (!drag) return;

      const scale = zoomRef.current || 1;
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      const { origin, mode } = drag;

      let geometry;
      if (mode === "move") {
        geometry = {
          posX: snap(origin.posX + dx),
          posY: snap(origin.posY + dy),
        };
      } else if (mode === "line-start") {
        geometry = {
          posX: snap(origin.posX + dx),
          posY: snap(origin.posY + dy),
          width: snap(origin.width - dx),
          height: snap(origin.height - dy),
        };
      } else if (mode === "line-end") {
        geometry = {
          width: snap(origin.width + dx),
          height: snap(origin.height + dy),
        };
      } else {
        geometry = { width: Math.max(80, snap(origin.width + dx)) };
      }

      if (mode === "line-start" || mode === "line-end") {
        const { cardAtPoint: hitTest, pointInCanvas: toCanvas } =
          helpersRef.current;
        const hovered = hitTest(toCanvas(e));
        drag.dockId = hovered;
        setDropTargetId(hovered);
      }

      drag.latest = geometry;
      setEntries((prev) =>
        prev.map((entry) =>
          String(entry.id) === String(drag.id)
            ? { ...entry, ...geometry }
            : entry,
        ),
      );
    };

    const finish = async () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      setDropTargetId(null);
      if (!drag?.latest) return;

      const patch = { ...drag.latest };
      if (drag.mode === "line-start") patch.fromId = drag.dockId ?? null;
      if (drag.mode === "line-end") patch.toId = drag.dockId ?? null;

      setEntries((prev) =>
        prev.map((entry) =>
          String(entry.id) === String(drag.id) ? { ...entry, ...patch } : entry,
        ),
      );

      const { error } = await saveElementGeometry(drag.id, patch);
      if (error) toast.error(error.message);
    };

    window.addEventListener("pointermove", applyDelta);
    window.addEventListener("pointerup", finish);
    return () => {
      window.removeEventListener("pointermove", applyDelta);
      window.removeEventListener("pointerup", finish);
    };
  }, [dragging]);

  // ── Card-to-card connecting ────────────────────────────────────────────────

  const beginConnect = (e, entry, anchor) => {
    e.stopPropagation();
    connectRef.current = {
      fromId: entry.id,
      origin: anchor,
      point: anchor,
      hoverId: null,
    };
    setConnectDraft({ from: anchor, to: anchor, hoverId: null });
    setConnecting(true);
  };

  useEffect(() => {
    if (!connecting) return;

    const onMove = (e) => {
      const draft = connectRef.current;
      if (!draft) return;
      const { cardAtPoint: hitTest, pointInCanvas: toCanvas } =
        helpersRef.current;
      const point = toCanvas(e);
      const hoverId = hitTest(point);
      draft.point = point;
      draft.hoverId =
        hoverId && String(hoverId) !== String(draft.fromId) ? hoverId : null;
      setConnectDraft({
        from: draft.origin,
        to: point,
        hoverId: draft.hoverId,
      });
    };

    const onUp = async () => {
      const draft = connectRef.current;
      connectRef.current = null;
      setConnectDraft(null);
      setConnecting(false);
      if (!draft) return;

      const { data, error } = await createLineElement({
        posX: snap(draft.origin.x),
        posY: snap(draft.origin.y),
        width: snap(draft.point.x - draft.origin.x),
        height: snap(draft.point.y - draft.origin.y),
        fromId: draft.fromId,
        toId: draft.hoverId,
        hasArrow: helpersRef.current.newLineHasArrow,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
      setEntries((prev) => [...prev, data]);
      setSelectedId(data.id);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [connecting]);

  // ── Element actions ────────────────────────────────────────────────────────

  const getViewportSpawn = useCallback(
    (width, height, index = 0) => {
      const viewport = viewportRef.current;
      const offset = (index % 5) * 20;

      if (!viewport) {
        return { x: 80 + offset, y: 80 + offset };
      }

      const scale = zoomRef.current || 1;
      return {
        x: Math.max(
          20,
          snap((viewport.scrollLeft + viewport.clientWidth / 2) / scale - width / 2 + offset),
        ),
        y: Math.max(
          20,
          snap((viewport.scrollTop + viewport.clientHeight / 2) / scale - height / 2 + offset),
        ),
      };
    },
    [],
  );

  const openAdd = () => {
    setAddPosition(
      getViewportSpawn(PERSON_CARD_WIDTH, PERSON_CARD_HEIGHT, people.length),
    );
    setEditingEntry(null);
    setModalOpen(true);
  };
  const openEdit = (entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
    setAddPosition(null);
  };

  const handleAddText = async () => {
    const position = getViewportSpawn(240, 40, texts.length);
    const { data, error } = await createTextElement({
      textContent: "Double-click to edit",
      posX: position.x,
      posY: position.y,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries((prev) => [...prev, data]);
    setSelectedId(data.id);
  };

  const handleAddLine = async () => {
    const position = getViewportSpawn(220, 20, lines.length);
    const { data, error } = await createLineElement({
      posX: position.x,
      posY: position.y,
      width: 220,
      height: 0,
      hasArrow: newLineHasArrow,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries((prev) => [...prev, data]);
    setSelectedId(data.id);
  };

  const toggleSelectedLineArrow = async () => {
    const line = lines.find((item) => String(item.id) === String(selectedId));
    if (!line) return;

    const next = !line.hasArrow;
    setEntries((prev) =>
      prev.map((item) =>
        String(item.id) === String(line.id) ? { ...item, hasArrow: next } : item,
      ),
    );

    const { error } = await saveElementGeometry(line.id, { hasArrow: next });
    if (error) {
      toast.error(error.message);
      setEntries((prev) =>
        prev.map((item) =>
          String(item.id) === String(line.id)
            ? { ...item, hasArrow: line.hasArrow }
            : item,
        ),
      );
    }
  };

  const handleDuplicate = async () => {
    if (!selectedElement) return;

    let result;
    if (selectedElement.elementType === ELEMENT_TYPES.PERSON) {
      result = await createOrgChartEntry({
        name: selectedElement.name,
        position: selectedElement.position,
        responsibilities: selectedElement.responsibilities,
        employmentType: selectedElement.employmentType,
        photoUrl: selectedElement.photoUrl,
        parentId: selectedElement.parentId,
        sortOrder: selectedElement.sortOrder,
        posX: (selectedElement.posX ?? 0) + 30,
        posY: (selectedElement.posY ?? 0) + 30,
      });
    } else if (selectedElement.elementType === ELEMENT_TYPES.TEXT) {
      result = await createTextElement({
        textContent: selectedElement.textContent,
        posX: (selectedElement.posX ?? 0) + 30,
        posY: (selectedElement.posY ?? 0) + 30,
        width: selectedElement.width ?? 240,
        fontSize: selectedElement.fontSize ?? 18,
        color: selectedElement.color || "#0f172a",
      });
    } else {
      const { start, end } = resolveLineEndpoints(selectedElement, rectById);
      result = await createLineElement({
        posX: start.x + 30,
        posY: start.y + 30,
        width: end.x - start.x,
        height: end.y - start.y,
        color: selectedElement.color || "#475569",
        hasArrow: selectedElement.hasArrow,
      });
    }

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setEntries((prev) => [...prev, result.data]);
    setSelectedId(result.data.id);
    toast.success("Element duplicated.");
  };

  const toggleBranchMode = () => {
    setBranchMode((active) => !active);
    setBranchSourceId(null);
    setSelectedId(null);
  };

  const handleBranchCard = async (e, entry) => {
    e.stopPropagation();

    if (!branchSourceId) {
      setBranchSourceId(entry.id);
      setSelectedId(entry.id);
      toast.success("Source selected. Click target boxes.");
      return;
    }

    if (String(branchSourceId) === String(entry.id)) return;

    const alreadyConnected = lines.some(
      (line) =>
        String(line.fromId) === String(branchSourceId) &&
        String(line.toId) === String(entry.id),
    );
    if (alreadyConnected) {
      toast.error("These boxes are already connected.");
      return;
    }

    const sourceRect = rectById.get(String(branchSourceId));
    const targetRect = rectById.get(String(entry.id));
    if (!sourceRect || !targetRect) return;

    const start = {
      x: sourceRect.x + sourceRect.w / 2,
      y: sourceRect.y + sourceRect.h,
    };
    const end = {
      x: targetRect.x + targetRect.w / 2,
      y: targetRect.y,
    };

    const { data, error } = await createLineElement({
      posX: start.x,
      posY: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      fromId: branchSourceId,
      toId: entry.id,
      color: "#0f172a",
      hasArrow: newLineHasArrow,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setEntries((prev) => [...prev, data]);
    toast.success(`Connected to ${entry.name}. Select another target.`);
  };

  const handleAutoArrange = async () => {
    const layout = autoLayoutPositions(entries);
    if (layout.length === 0) return;

    const byId = new Map(layout.map((p) => [String(p.id), p]));
    setEntries((prev) =>
      prev.map((entry) => {
        const found = byId.get(String(entry.id));
        return found ? { ...entry, posX: found.posX, posY: found.posY } : entry;
      }),
    );

    const { error } = await saveManyPositions(layout);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Chart arranged by reporting line.");
  };

  const handleDelete = useCallback(
    async (entry) => {
      const label =
        entry.elementType === ELEMENT_TYPES.PERSON
          ? `"${entry.name}" (${entry.position})`
          : `this ${entry.elementType}`;
      if (!window.confirm(`Delete ${label}?`)) return;

      const { error } = await deleteOrgChartEntry(entry.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setEntries((prev) =>
        prev.filter((item) => String(item.id) !== String(entry.id)),
      );
      setSelectedId(null);
    },
    [],
  );

  const handleTextCommit = async (entry, value) => {
    setEditingTextId(null);
    if (value === entry.textContent) return;

    setEntries((prev) =>
      prev.map((item) =>
        String(item.id) === String(entry.id)
          ? { ...item, textContent: value }
          : item,
      ),
    );
    const { error } = await saveElementGeometry(entry.id, {
      textContent: value,
    });
    if (error) toast.error(error.message);
  };

  const enterViewMode = useCallback(() => {
    setCanvasMode("view");
    setSelectedId(null);
    setEditingTextId(null);
    setBranchMode(false);
    setBranchSourceId(null);
    setConnectDraft(null);
    setConnecting(false);
    setDropTargetId(null);
    setModalOpen(false);
    setEditingEntry(null);
  }, []);

  const enterEditMode = useCallback(() => {
    setCanvasMode("edit");
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isViewMode) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "d" &&
        selectedElement &&
        !editingTextId
      ) {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (e.key === "Escape" && branchMode) {
        setBranchMode(false);
        setBranchSourceId(null);
        return;
      }
      if (editingTextId || !selectedId) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }
      const entry = entries.find((item) => String(item.id) === String(selectedId));
      if (entry) {
        e.preventDefault();
        handleDelete(entry);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    entries,
    selectedId,
    selectedElement,
    editingTextId,
    handleDelete,
    handleDuplicate,
    branchMode,
    isViewMode,
  ]);

  const regularCount = useMemo(
    () => people.filter((e) => e.employmentType === "regular").length,
    [people],
  );
  const contractualCount = useMemo(
    () => people.filter((e) => e.employmentType === "contractual").length,
    [people],
  );
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const setCardRef = (id) => (node) => {
    if (node) cardRefs.current.set(String(id), node);
    else cardRefs.current.delete(String(id));
  };

  const toolbarButton =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95";

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 bg-gradient-to-b from-slate-50/80 via-transparent to-sky-50/30 pb-12 sm:space-y-8">
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-900 px-6 py-8 shadow-2xl shadow-blue-900/30 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                PSTO Calendar · Org Chart
              </div>
              <div>
                <p className="text-sm font-medium text-sky-100/90">
                  {getGreeting()}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Organizational chart
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-sky-100/85 sm:text-base">
                  {isViewMode
                    ? "Professional view of the PSTO-Marinduque organizational structure."
                    : "Drag any card, text, or line anywhere on the canvas. Positions save automatically."}
                </p>
              </div>
              <p className="text-xs font-medium text-sky-200/80">{todayLabel}</p>
            </div>

            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xs lg:grid-cols-1">
              <StatCard
                label="Total personnel"
                value={loading ? "…" : String(people.length)}
                sublabel="On the canvas"
                accent="sky"
              />
              <StatCard
                label="Regular / Contractual"
                value={loading ? "…" : `${regularCount} / ${contractualCount}`}
                sublabel="Employment split"
                accent="amber"
              />
            </div>
          </div>
        </section>

        <section
          className={
            isFullscreen
              ? "fixed inset-0 z-[80] flex flex-col overflow-hidden bg-white"
              : "ut-animate-in ut-delay-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm"
          }
        >
          {!isFullscreen && (
            <PanelHeader
              iconGradient="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.98 5.98 0 00-.34-1.99m-12 .66a5.98 5.98 0 01-.34-1.99m0 0A5.869 5.869 0 0112 14.25c1.993 0 3.815.784 5.16 2.06"
                  />
                </svg>
              }
              title="PSTO-Marinduque chart"
              subtitle={
                isViewMode
                  ? "Presentation mode — zoom and scroll to explore. Switch to Edit to rearrange."
                  : "Hover a card and drag a blue dot onto another card to connect them. Double-click a card to edit."
              }
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={enterViewMode}
                      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                        isViewMode
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={enterEditMode}
                      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                        isEditMode
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Edit
                    </button>
                  </div>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={openAdd}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-blue-700 active:scale-95"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                      Add personnel
                    </button>
                  )}
                </div>
              }
            />
          )}

          <div
            className={`flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-6 ${
              isFullscreen ? "shrink-0 shadow-sm" : ""
            }`}
          >
            {isFullscreen && (
              <p className="mr-2 text-sm font-bold text-slate-800">
                {isViewMode ? "Org chart view" : "Org chart editor"}
              </p>
            )}

            {isFullscreen && (
              <div className="mr-2 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={enterViewMode}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
                    isViewMode
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={enterEditMode}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
                    isEditMode
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Edit
                </button>
              </div>
            )}

            {isEditMode && (
              <>
                <button type="button" onClick={openAdd} className={toolbarButton}>
                  Add personnel
                </button>
                <button type="button" onClick={handleAddText} className={toolbarButton}>
                  Add text
                </button>
                <button type="button" onClick={handleAddLine} className={toolbarButton}>
                  Add line
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={!selectedElement}
                  className={`${toolbarButton} disabled:cursor-not-allowed disabled:opacity-40`}
                  title="Duplicate selected element (Ctrl+D)"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => setNewLineHasArrow((v) => !v)}
                  className={`${toolbarButton} ${
                    newLineHasArrow
                      ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20"
                      : ""
                  }`}
                  title="New lines and connectors use this arrow setting"
                >
                  {newLineHasArrow ? "Arrow: On" : "Arrow: Off"}
                </button>
                {selectedLine && (
                  <button
                    type="button"
                    onClick={toggleSelectedLineArrow}
                    className={toolbarButton}
                    title="Toggle arrow on the selected line"
                  >
                    {selectedLine.hasArrow
                      ? "Selected: remove arrow"
                      : "Selected: add arrow"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleBranchMode}
                  className={`${toolbarButton} ${
                    branchMode
                      ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20"
                      : ""
                  }`}
                  title="Connect one box to multiple boxes"
                >
                  {branchMode
                    ? branchSourceId
                      ? "Click target boxes · Done"
                      : "Click source box · Cancel"
                    : "Branch connector"}
                </button>
                <button
                  type="button"
                  onClick={handleAutoArrange}
                  className={toolbarButton}
                >
                  Auto-arrange
                </button>
              </>
            )}

            <button
              type="button"
              onClick={loadEntries}
              disabled={loading}
              className={`${toolbarButton} disabled:opacity-40`}
            >
              Refresh
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
                  className="rounded px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="w-12 text-center text-xs font-bold tabular-nums text-slate-600">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
                  className="rounded px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen((v) => !v)}
                className={toolbarButton}
                title={
                  isFullscreen
                    ? "Exit fullscreen (Esc)"
                    : isViewMode
                      ? "Fullscreen view"
                      : "Fullscreen edit"
                }
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                      />
                    </svg>
                    Exit
                  </>
                ) : (
                  <>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                      />
                    </svg>
                    Fullscreen
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col ${
              isFullscreen ? "p-3" : "p-4 sm:p-5"
            }`}
          >
            {loading ? (
              <div className="h-[640px] animate-pulse rounded-2xl bg-slate-100" />
            ) : (
              <div
                ref={viewportRef}
                className={`relative overflow-auto rounded-2xl border ${
                  isViewMode
                    ? "border-slate-200/80 bg-gradient-to-br from-[#f7f6f2] via-white to-slate-50"
                    : "border-slate-200 bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
                } ${isFullscreen ? "min-h-0 flex-1" : "max-h-[75vh]"}`}
                onPointerDown={() => {
                  if (isEditMode) setSelectedId(null);
                }}
              >
                <div
                  style={{
                    width: canvasSize.width * zoom,
                    height: canvasSize.height * zoom,
                  }}
                >
                  <div
                    ref={canvasRef}
                    className="relative origin-top-left"
                    style={{
                      width: canvasSize.width,
                      height: canvasSize.height,
                      transform: `scale(${zoom})`,
                    }}
                  >
                    <svg
                      className="absolute inset-0 h-full w-full"
                      style={{ pointerEvents: "none" }}
                    >
                      <defs>
                        <marker
                          id="org-chart-arrow"
                          viewBox="0 0 10 10"
                          refX="9"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                        </marker>
                        <marker
                          id="org-chart-arrow-muted"
                          viewBox="0 0 10 10"
                          refX="9"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                        </marker>
                      </defs>

                      {connectors.map((connector) => (
                        <polyline
                          key={connector.id}
                          points={connector.points}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth={1.5}
                          markerEnd="url(#org-chart-arrow-muted)"
                        />
                      ))}

                      {lines.map((line) => {
                        const { start, end } = resolveLineEndpoints(
                          line,
                          rectById,
                        );
                        const x1 = start.x;
                        const y1 = start.y;
                        const x2 = end.x;
                        const y2 = end.y;
                        const elbowPoints = orthogonalConnectorPoints(start, end);
                        const isSelected = String(selectedId) === String(line.id);

                        return (
                          <g key={line.id} style={{ pointerEvents: isEditMode ? "auto" : "none" }}>
                            <polyline
                              points={elbowPoints}
                              fill="none"
                              stroke={line.color || "#475569"}
                              strokeWidth={2}
                              strokeLinejoin="round"
                              markerEnd={
                                line.hasArrow ? "url(#org-chart-arrow)" : undefined
                              }
                            />
                            {isEditMode && (
                              <polyline
                                points={elbowPoints}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={14}
                                strokeLinejoin="round"
                                className="cursor-move"
                                onPointerDown={(e) => beginDrag(e, line, "move")}
                              />
                            )}
                            {isEditMode && isSelected && (
                              <>
                                <circle
                                  cx={x1}
                                  cy={y1}
                                  r={6}
                                  fill="#fff"
                                  stroke="#0ea5e9"
                                  strokeWidth={2}
                                  className="cursor-crosshair"
                                  onPointerDown={(e) =>
                                    beginDrag(e, line, "line-start")
                                  }
                                />
                                <circle
                                  cx={x2}
                                  cy={y2}
                                  r={6}
                                  fill="#fff"
                                  stroke="#0ea5e9"
                                  strokeWidth={2}
                                  className="cursor-crosshair"
                                  onPointerDown={(e) =>
                                    beginDrag(e, line, "line-end")
                                  }
                                />
                              </>
                            )}
                          </g>
                        );
                      })}

                      {connectDraft && (
                        <polyline
                          points={orthogonalConnectorPoints(
                            connectDraft.from,
                            connectDraft.to,
                          )}
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          markerEnd={
                            newLineHasArrow ? "url(#org-chart-arrow)" : undefined
                          }
                        />
                      )}
                    </svg>

                    {people.map((entry) => {
                      const isSelected =
                        isEditMode && String(selectedId) === String(entry.id);
                      const isDropTarget =
                        isEditMode &&
                        (String(dropTargetId) === String(entry.id) ||
                          String(connectDraft?.hoverId ?? "") === String(entry.id));
                      const isBranchSource =
                        isEditMode &&
                        branchMode &&
                        String(branchSourceId ?? "") === String(entry.id);
                      const rect = rectById.get(String(entry.id));
                      const anchors = rect ? sideAnchors(rect) : null;

                      return (
                        <div
                          key={entry.id}
                          ref={setCardRef(entry.id)}
                          className={`absolute touch-none select-none ${
                            isViewMode
                              ? "cursor-default"
                              : branchMode
                                ? "cursor-crosshair"
                                : "cursor-move"
                          } ${
                            isBranchSource
                              ? "ring-4 ring-violet-500 ring-offset-2"
                              : isDropTarget
                              ? "ring-2 ring-emerald-500 ring-offset-2"
                              : isSelected
                                ? "ring-2 ring-sky-500 ring-offset-2"
                                : ""
                          } ${isViewMode ? "shadow-md shadow-slate-900/5" : "group"}`}
                          style={{ left: entry.posX ?? 0, top: entry.posY ?? 0 }}
                          onPointerDown={(e) => {
                            if (isViewMode) return;
                            branchMode
                              ? handleBranchCard(e, entry)
                              : beginDrag(e, entry, "move");
                          }}
                          onDoubleClick={() => {
                            if (isEditMode && !branchMode) openEdit(entry);
                          }}
                        >
                          <PersonCard entry={entry} />

                          {isEditMode &&
                            !branchMode &&
                            anchors &&
                            Object.entries(anchors).map(([side, anchor]) => (
                              <span
                                key={side}
                                role="presentation"
                                title="Drag to another card to connect"
                                onPointerDown={(e) =>
                                  beginConnect(e, entry, anchor)
                                }
                                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-sky-500 bg-white opacity-0 transition group-hover:opacity-100"
                                style={{
                                  left: anchor.x - (entry.posX ?? 0),
                                  top: anchor.y - (entry.posY ?? 0),
                                }}
                              />
                            ))}
                        </div>
                      );
                    })}

                    {texts.map((entry) => {
                      const isSelected =
                        isEditMode && String(selectedId) === String(entry.id);
                      const isEditing =
                        isEditMode && String(editingTextId) === String(entry.id);

                      return (
                        <div
                          key={entry.id}
                          ref={setCardRef(entry.id)}
                          className={`absolute touch-none ${
                            isViewMode
                              ? "cursor-default select-none"
                              : isEditing
                                ? "cursor-text"
                                : "cursor-move select-none"
                          } ${isSelected ? "ring-2 ring-sky-500 ring-offset-2" : ""}`}
                          style={{
                            left: entry.posX ?? 0,
                            top: entry.posY ?? 0,
                            width: entry.width ?? 240,
                          }}
                          onPointerDown={(e) => {
                            if (isViewMode) return;
                            isEditing
                              ? e.stopPropagation()
                              : beginDrag(e, entry, "move");
                          }}
                          onDoubleClick={() => {
                            if (isEditMode) setEditingTextId(entry.id);
                          }}
                        >
                          {isEditing ? (
                            <textarea
                              autoFocus
                              defaultValue={entry.textContent}
                              onBlur={(e) => handleTextCommit(entry, e.target.value)}
                              className="w-full resize-y rounded border border-sky-400 bg-white/95 p-1 outline-none"
                              style={{
                                fontSize: entry.fontSize ?? 18,
                                color: entry.color || "#0f172a",
                              }}
                            />
                          ) : (
                            <p
                              className="whitespace-pre-wrap break-words font-semibold leading-tight"
                              style={{
                                fontSize: entry.fontSize ?? 18,
                                color: entry.color || "#0f172a",
                              }}
                            >
                              {entry.textContent ||
                                (isViewMode ? "" : "Double-click to edit")}
                            </p>
                          )}

                          {isSelected && !isEditing && (
                            <span
                              role="presentation"
                              onPointerDown={(e) => beginDrag(e, entry, "text-resize")}
                              className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-ew-resize rounded-full border-2 border-sky-500 bg-white"
                            />
                          )}
                        </div>
                      );
                    })}

                    {entries.length === 0 && (
                      <div className="absolute inset-x-0 top-40 text-center">
                        <p className="text-lg font-bold text-slate-900">
                          Empty canvas
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {isViewMode
                            ? "No personnel on the chart yet. Switch to Edit to add entries."
                            : "Add personnel, text, or lines — then drag them into place."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-8">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="h-3.5 w-6 bg-amber-400" aria-hidden />
                Regular Personnel
              </span>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="h-3.5 w-6 bg-sky-400" aria-hidden />
                Contractual
              </span>
            </div>
          </div>
        </section>
      </div>

      <AddOrgChartModal
        isOpen={modalOpen}
        editEntry={editingEntry}
        entries={people}
        initialPosition={addPosition}
        onClose={closeModal}
        onSuccess={loadEntries}
      />
    </Layout>
  );
};

export default AddOrgChart;

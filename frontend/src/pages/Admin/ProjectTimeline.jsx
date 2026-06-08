import Layout from "../../components/Layout/Layout";
const ProjectTimeline = () => {
  return (
    <Layout>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-x-hidden bg-gradient-to-b from-slate-50/80 via-transparent to-blue-50/40 pb-10 sm:space-y-8 lg:max-w-[min(80rem,calc(100vw-19rem))]">
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 px-6 py-8 shadow-2xl shadow-blue-900/30 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-400/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]"
            aria-hidden
          />
        </section>
      </div>
    </Layout>
  );
};

export default ProjectTimeline;

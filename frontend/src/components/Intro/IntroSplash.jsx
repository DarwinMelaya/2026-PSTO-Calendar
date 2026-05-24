import { useEffect, useState } from "react";

const DOST_LOGO_SRC = "/Assets/dostlogo.png";
const MIN_DISPLAY_MS = 2200;
const EXIT_MS = 550;

const IntroSplash = ({ onComplete }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    document.body.classList.add("intro-active");

    const exitTimer = window.setTimeout(() => setExiting(true), MIN_DISPLAY_MS);
    const doneTimer = window.setTimeout(() => {
      document.body.classList.remove("intro-active");
      onComplete();
    }, MIN_DISPLAY_MS + EXIT_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
      document.body.classList.remove("intro-active");
    };
  }, [onComplete]);

  return (
    <div
      className={`intro-splash${exiting ? " intro-splash--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label="Loading application"
    >
      <div className="intro-splash__panel">
        <div className="intro-splash__logo-wrap">
          <img
            src={DOST_LOGO_SRC}
            alt="Department of Science and Technology"
            className="intro-splash__logo"
            width={112}
            height={112}
            decoding="async"
          />
        </div>

        <div className="intro-splash__meta">
          <p className="intro-splash__org">
            Department of Science and Technology
          </p>
          <p className="intro-splash__sub">
            Marinduque Provincial Science and Technology Office
          </p>
        </div>

        <div className="intro-splash__progress" aria-hidden="true">
          <div className="intro-splash__progress-track">
            <div className="intro-splash__progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroSplash;

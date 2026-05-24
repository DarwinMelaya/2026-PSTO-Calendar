import { useCallback, useState } from "react";
import { Toaster } from "react-hot-toast";
import IntroSplash from "./components/Intro/IntroSplash";
import { Routers } from "./Routers/Routers";

const shouldShowIntro = () => {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return path === "/" || path === "/login";
};

const App = () => {
  const [introDone, setIntroDone] = useState(() => !shouldShowIntro());
  const handleIntroComplete = useCallback(() => setIntroDone(true), []);

  if (!introDone) {
    return <IntroSplash onComplete={handleIntroComplete} />;
  }

  return (
    <>
      <Toaster position="top-center" />
      <Routers />
    </>
  );
};

export default App;

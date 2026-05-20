import { Toaster } from "react-hot-toast";
import { Routers } from "./Routers/Routers";

const App = () => {
  return (
    <>
      <Toaster position="top-center" />
      <Routers />
    </>
  );
};

export default App;

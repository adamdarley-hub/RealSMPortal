import "./global.css";
import { createRoot } from "react-dom/client";

const App = () => (
  <div>
    <h1>Test App</h1>
    <p>If you can see this, React is working</p>
  </div>
);

createRoot(document.getElementById("root")!).render(<App />);

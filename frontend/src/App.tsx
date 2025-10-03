import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Confirm from "./pages/Confirm";
import ClientProviders from "./components/ClientProvider";
import "./App.css";

function App() {
  return (
    <ClientProviders>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/confirm" element={<Confirm />} />
      </Routes>
    </ClientProviders>
  );
}

export default App;

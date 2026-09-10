import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import InitialRedirect from "./components/InitialRedirect";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import SessionSetup from "./pages/SessionSetup/SessionSetup";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <InitialRedirect />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        element={
          <ProtectedRoute />
        }
      >
        <Route
          path="/session"
          element={
            <SessionSetup />
          }
        />

        <Route
          path="/dashboard"
          element={
            <Dashboard />
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;

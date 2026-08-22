import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div>
          <p className="office-kicker">SABUY CALL · DEVICE OWNER</p>
          <h1>Operator gate</h1>
        </div>
      </header>
      <p className="hint">
        Set <code>OPERATOR_PASSWORD</code> in the server env. In local development
        the gate stays open until that variable is set.
      </p>
      <Suspense fallback={<p className="hint">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

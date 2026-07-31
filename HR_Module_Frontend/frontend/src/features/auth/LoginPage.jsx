import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { login } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";

export default function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await login(email, password);

    setLoading(false);

    if (response.ok) {
      setToken(response.data.access_token);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } else {
      setError(response.data?.detail || "Invalid email or password.");
    }
  };

  return (
    <div className="bg-background h-screen w-full flex items-center justify-center p-md md:p-xl">
      <div className="bg-surface-container-lowest w-full max-w-[400px] border border-surface-variant rounded-lg p-xl flex flex-col items-center">
        <div className="flex flex-col items-center mb-xl">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-sm">
            <Icon name="corporate_fare" className="text-on-primary text-[24px]" />
          </div>
          <h1 className="font-h1 text-h1 text-primary text-center">HR Automation System</h1>
        </div>

        <form className="w-full flex flex-col gap-lg" onSubmit={handleSubmit}>
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

          <Button type="submit" loading={loading} className="mt-sm">
            Sign In
            <Icon name="arrow_forward" className="text-[18px]" />
          </Button>
        </form>

        <div className="mt-xl text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Need access? <span className="text-primary font-medium">Contact IT Support</span>
          </p>
        </div>
      </div>
    </div>
  );
}

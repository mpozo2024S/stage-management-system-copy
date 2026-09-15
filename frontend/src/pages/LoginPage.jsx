import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Input, FormField, Alert } from "../components/ui/index.jsx";
import fmLogo from "../assets/fm-logo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors = {};

    if (!form.email.trim()) {
      errors.email = "Email is required";
    }

    if (!form.password.trim()) {
      errors.password = "Password is required";
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((f) => ({
      ...f,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src={fmLogo}
            alt="FM Theatre Productions"
            className="h-32 mx-auto mb-4 object-contain"
          />

          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">
            Employee Portal
          </p>
        </div>

        <div className="bg-[#242424] rounded-xl border border-[#333] p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Alert type="error" message={error} />

            <FormField label="Email" error={fieldErrors.email}>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
            </FormField>

            <FormField label="Password" error={fieldErrors.password}>
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
            </FormField>

            <Button
              type="submit"
              variant="danger"
              loading={loading}
              className="w-full font-bold uppercase tracking-widest py-3"
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account?{" "}
            <Link
              to="/register"
              className="text-[#E8574A] font-medium hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
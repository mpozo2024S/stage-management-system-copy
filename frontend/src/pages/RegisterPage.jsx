import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Input, FormField, Alert } from "../components/ui/index.jsx";
import fmLogo from "../assets/fm-logo.png";

const ROLES = ["Admin", "InventoryManager", "SetBuilder", "SetDesigner", "Crew"];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Crew",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = "Full name is required";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = "Please enter a valid email";
    }

    if (!form.password) {
      errors.password = "Password is required";
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Passwords do not match";
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
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      navigate("/login");
    } catch (err) {
      setError(err.message || "Registration failed");
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

            <FormField label="Full Name" error={fieldErrors.name}>
              <Input
                name="name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
            </FormField>

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
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
            </FormField>

            <FormField
              label="Confirm Password"
              error={fieldErrors.confirmPassword}
            >
              <Input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
            </FormField>

            <FormField label="Role">
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FormField>

            <Button
              type="submit"
              variant="danger"
              loading={loading}
              className="w-full font-bold uppercase tracking-widest py-3"
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#E8574A] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
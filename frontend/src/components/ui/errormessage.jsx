import React from "react";

export default function ErrorMessage({ message, type = "error", className = "" }) {
  if (!message) return null;

  const baseStyles = "w-full p-3 mb-3 text-sm rounded border";

  const typeStyles = {
    error: "text-red-700 bg-red-100 border-red-300",
    warning: "text-yellow-700 bg-yellow-100 border-yellow-300",
    info: "text-blue-700 bg-blue-100 border-blue-300",
  };

  return (
    <div className={`${baseStyles} ${typeStyles[type] || typeStyles.error} ${className}`}>
      {message}
    </div>
  );
}
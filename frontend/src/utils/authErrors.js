export const getAuthErrorMessage = (error) => {
  if (!error) return "Something went wrong. Please try again.";

  const code = error.code ?? "";
  const message = error.message ?? "";

  if (
    code === "email_not_confirmed" ||
    message.toLowerCase().includes("email not confirmed")
  ) {
    return {
      type: "email_not_confirmed",
      message:
        "Please confirm your email first. Check your inbox for the confirmation link.",
    };
  }

  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    message.toLowerCase().includes("invalid login credentials")
  ) {
    return {
      type: "invalid_credentials",
      message: "Invalid email or password. Please try again.",
    };
  }

  return { type: "unknown", message: message || "Something went wrong. Please try again." };
};

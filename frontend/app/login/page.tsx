import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <LoginForm />
    </div>
  );
}

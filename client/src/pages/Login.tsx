
import AuthForm from "@/components/AuthForm";

export default function Login() {
  return (
    <div className="page-fade min-h-screen bg-gradient-to-br from-[#050505] via-[#0b0b0b] to-[#0f0c05] text-white flex items-center justify-center">
      <AuthForm />
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 rounded-xl border border-[#1f1f1f] bg-[#0e0e0e] hover:border-[#C9A84C]/40 transition-colors">
      <p className="text-sm uppercase tracking-[0.2em] text-[#C9A84C] mb-2">{title}</p>
      <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

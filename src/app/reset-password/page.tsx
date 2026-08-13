import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <div className="shell py-16 max-w-md"><p className="t-eyebrow mb-2">Account security</p><h1 className="t-display text-3xl mb-6">Choose a new password</h1><ResetPasswordForm token={token} /></div>;
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, FormSection, Input, fieldBase } from "@/components/ui/FormField";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import { financeService } from "@/services/finance";
import { cn } from "@/utils/cn";

function splitName(fullName?: string | null) {
  const parts = String(fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, changePassword, logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const names = splitName(user.fullName);
    setFirstName(names.firstName);
    setLastName(names.lastName);
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setPendingFile(null);
    setRemoveAvatar(false);
    setPreview(null);
    setErrors({});
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const avatarSrc = preview ?? (removeAvatar ? null : user?.avatarUrl ?? null);

  const resetForm = () => {
    if (!user) return;
    const names = splitName(user.fullName);
    setFirstName(names.firstName);
    setLastName(names.lastName);
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setPendingFile(null);
    setRemoveAvatar(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setErrors({});
  };

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|jpg)$/i.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {
      toast.error("Please choose a JPG or PNG image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be below 2 MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(file);
    setRemoveAvatar(false);
    setPreview(URL.createObjectURL(file));
  };

  const onClearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    setRemoveAvatar(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email";
    if (!phone.trim()) next.phone = "Phone number is required";
    if (password) {
      if (password.length < 8) next.password = "Password must be at least 8 characters";
      if (!confirmPassword) next.confirmPassword = "Confirm your new password";
      else if (confirmPassword !== password) next.confirmPassword = "Passwords do not match";
      if (!currentPassword) next.currentPassword = "Enter your current password to change it";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    if (!user || !validate()) return;
    setSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      let nextUser = await financeService.updateProfile({
        fullName,
        email: email.trim(),
        phone: phone.trim(),
      });
      nextUser = {
        ...user,
        ...nextUser,
        permissions: nextUser.permissions ?? user.permissions,
        avatarColor: user.avatarColor,
      };

      if (pendingFile) {
        nextUser = {
          ...nextUser,
          ...(await financeService.uploadMyAvatar(pendingFile)),
          permissions: nextUser.permissions ?? user.permissions,
          avatarColor: user.avatarColor,
        };
      } else if (removeAvatar && user.avatarUrl) {
        nextUser = {
          ...nextUser,
          ...(await financeService.removeMyAvatar()),
          permissions: nextUser.permissions ?? user.permissions,
          avatarColor: user.avatarColor,
        };
      }

      setUser(nextUser);

      if (password) {
        await changePassword(currentPassword, password);
        toast.success("Profile saved. Please sign in with your new password.");
        await logout();
        navigate("/login", { replace: true });
        return;
      }

      toast.success("Profile updated");
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setPendingFile(null);
      setRemoveAvatar(false);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="text-xs font-medium text-ink-muted">
        Dashboard <span className="mx-1.5 text-line">/</span>
        <span className="text-ink-soft">Profile</span>
      </div>

      <div className="rounded-none bg-panel p-4 shadow-sm ring-1 ring-line sm:p-6">
        <h1 className="text-xl font-bold text-ink">Profile</h1>

        <div className="mt-5 space-y-6">
          <FormSection title="Basic Information" icon={<UserRound />} />

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap">
            <div className="relative shrink-0">
              <Avatar
                name={user.fullName}
                src={avatarSrc}
                color={user.avatarColor}
                size="xl"
                shape="rounded"
                className="h-20 w-20 text-lg ring-2 ring-line"
              />
              {(avatarSrc || user.avatarUrl) && !removeAvatar && (
                <button
                  type="button"
                  onClick={onClearImage}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center bg-rose-500 text-white shadow-sm hover:bg-rose-600"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>

            <div className="min-w-0 w-full space-y-1.5 pt-1 sm:w-auto">
              <Button type="button" className="w-full sm:w-auto" onClick={() => fileRef.current?.click()}>
                Change Image
              </Button>
              <p className="text-xs text-ink-muted">
                Upload an image below 2 MB, Accepted File format JPG, PNG
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  onPickImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="First Name"
              required
              value={firstName}
              error={errors.firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              required
              value={lastName}
              error={errors.lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              required
              value={email}
              error={errors.email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone Number"
              required
              value={phone}
              error={errors.phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Field label="Password" error={errors.password} htmlFor="profile-password">
              <div className="relative">
                <input
                  id="profile-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(fieldBase, "h-10 pr-10")}
                  aria-invalid={errors.password ? true : undefined}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field
              label="Confirm Password"
              required={Boolean(password)}
              error={errors.confirmPassword}
              htmlFor="profile-confirm"
            >
              <div className="relative">
                <input
                  id="profile-confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(fieldBase, "h-10 pr-10")}
                  aria-invalid={errors.confirmPassword ? true : undefined}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {password ? (
              <Field
                label="Current Password"
                required
                error={errors.currentPassword}
                htmlFor="profile-current"
                className="sm:col-span-2"
              >
                <div className="relative max-w-md">
                  <input
                    id="profile-current"
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={cn(fieldBase, "h-10 pr-10")}
                    aria-invalid={errors.currentPassword ? true : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
                    onClick={() => setShowCurrent((v) => !v)}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full !bg-navy-800 !text-white hover:!brightness-110 sm:w-auto"
              onClick={() => {
                resetForm();
                navigate(-1);
              }}
            >
              Cancel
            </Button>
            <Button type="button" className="w-full sm:w-auto" loading={saving} onClick={onSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

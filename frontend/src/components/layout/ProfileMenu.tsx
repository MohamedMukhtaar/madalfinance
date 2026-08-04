import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { KeyRound, LogOut, UserPen } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import toast from "react-hot-toast";
import type { User } from "@/types";

export function ProfileMenu({
  user,
  trigger,
  onLogout,
}: {
  user: User | null;
  trigger: ReactNode;
  onLogout: () => void;
}) {
  const { changeUsername, changePassword } = useAuth();
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <>
      <Dropdown
        trigger={trigger}
        items={[
          {
            label: (
              <div className="px-1 py-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.fullName}</p>
                <p className="text-xs text-slate-400">@{user?.username}</p>
              </div>
            ),
            onClick: () => undefined,
          },
          { divider: true },
          {
            label: "Change Username",
            icon: <UserPen className="h-4 w-4" />,
            onClick: () => setUsernameOpen(true),
          },
          {
            label: "Change Password",
            icon: <KeyRound className="h-4 w-4" />,
            onClick: () => setPasswordOpen(true),
          },
          { divider: true },
          {
            label: "Logout",
            icon: <LogOut className="h-4 w-4" />,
            danger: true,
            onClick: onLogout,
          },
        ]}
      />

      <ChangeUsernameModal
        open={usernameOpen}
        onClose={() => setUsernameOpen(false)}
        onSubmit={changeUsername}
        current={user?.username}
      />
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSubmit={changePassword}
      />
    </>
  );
}

function ChangeUsernameModal({
  open,
  onClose,
  onSubmit,
  current,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newUsername: string) => Promise<void>;
  current?: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<{ username: string; password: string }>({
    defaultValues: { username: current ?? "", password: "" },
  });

  const submit = handleSubmit(async (d) => {
    try {
      await onSubmit(d.password, d.username);
      reset();
      toast.success("Username updated");
      onClose();
    } catch (err) {
      setError("password", { message: getErrorMessage(err) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Username"
      subtitle="Confirm with your password to choose a new username."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isSubmitting} onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Username"
          placeholder="Enter new username"
          error={errors.username?.message}
          {...register("username", {
            required: "Username is required",
            minLength: { value: 3, message: "Must be at least 3 characters" },
          })}
        />
        <Input
          label="Current password"
          type="password"
          error={errors.password?.message}
          {...register("password", { required: "Password is required" })}
        />
      </form>
    </Modal>
  );
}

function ChangePasswordModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (current: string, next: string) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<{ current: string; next: string; confirm: string }>();

  const submit = handleSubmit(async (d) => {
    try {
      await onSubmit(d.current, d.next);
      reset();
      toast.success("Password updated");
      onClose();
    } catch (err) {
      setError("current", { message: getErrorMessage(err) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Password"
      subtitle="Your password should be strong and unique."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isSubmitting} onClick={submit}>
            Update password
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Current password"
          type="password"
          error={errors.current?.message}
          {...register("current", { required: "Current password is required" })}
        />
        <Input
          label="New password"
          type="password"
          error={errors.next?.message}
          {...register("next", {
            required: "New password is required",
            minLength: { value: 8, message: "Must be at least 8 characters" },
          })}
        />
        <Input
          label="Confirm new password"
          type="password"
          error={errors.confirm?.message}
          {...register("confirm", {
            required: "Please confirm your password",
            validate: (v, values) => v === values.next || "Passwords do not match",
          })}
        />
      </form>
    </Modal>
  );
}

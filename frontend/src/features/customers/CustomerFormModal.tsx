import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/queries";
import type { Customer } from "@/types";

interface CustomerForm {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  status: "active" | "inactive";
  notes: string;
}

export function CustomerFormModal({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}) {
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerForm>();

  useEffect(() => {
    if (open) {
      reset(
        customer
          ? {
              customerName: customer.customerName,
              companyName: customer.companyName ?? "",
              phone: customer.phone,
              email: customer.email,
              address: customer.address ?? "",
              city: customer.city ?? "",
              status: customer.status,
              notes: customer.notes ?? "",
            }
          : {
              customerName: "",
              companyName: "",
              phone: "",
              email: "",
              address: "",
              city: "",
              status: "active",
              notes: "",
            }
      );
    }
  }, [open, customer, reset]);

  const loading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: CustomerForm) => {
    if (isEdit && customer) {
      updateMutation.mutate(
        { id: customer.customerId, patch: data },
        { onSuccess: () => onClose() }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => onClose() });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit Customer" : "Add New Customer"}
      subtitle={isEdit ? customer?.customerCode : "Create a customer record in the system"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>
            {isEdit ? "Save changes" : "Create customer"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Customer Name"
            required
            placeholder="e.g. Mohamed Ali"
            error={errors.customerName?.message}
            {...register("customerName", { required: "Customer name is required" })}
          />
          <Input
            label="Company Name"
            placeholder="e.g. SomaliNet Telecom"
            {...register("companyName")}
          />
          <Input
            label="Phone"
            required
            placeholder="+252 61 555 0123"
            error={errors.phone?.message}
            {...register("phone", {
              required: "Phone is required",
              pattern: { value: /^[+0-9 ()-]{7,20}$/, message: "Enter a valid phone number" },
            })}
          />
          <Input
            label="Email"
            required
            type="email"
            placeholder="customer@company.com"
            error={errors.email?.message}
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
            })}
          />
          <Input label="Address" placeholder="Street, district" {...register("address")} />
          <Input label="City" placeholder="e.g. Mogadishu" {...register("city")} />
          <Select
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            {...register("status")}
          />
        </div>
        <Textarea label="Notes" placeholder="Optional notes about this customer" {...register("notes")} />
      </form>
    </Modal>
  );
}

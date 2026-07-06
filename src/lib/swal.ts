import Swal, { type SweetAlertIcon } from "sweetalert2";

const base = {
  confirmButtonText: "OK",
  confirmButtonColor: "#166534",
  buttonsStyling: true,
  customClass: {
    popup: "rounded-2xl font-sans",
    title: "text-lg font-semibold",
    confirmButton: "rounded-lg px-5 py-2 text-sm font-semibold",
  },
} as const;

export function swalOk(title: string, text?: string, icon: SweetAlertIcon = "success") {
  return Swal.fire({ ...base, icon, title, text, draggable: true });
}

export function swalError(title: string, text?: string) {
  return Swal.fire({ ...base, icon: "error", title, text, draggable: true });
}

export function swalInfo(title: string, text?: string) {
  return Swal.fire({ ...base, icon: "info", title, text, draggable: true });
}

export async function swalConfirm(title: string, text?: string) {
  const r = await Swal.fire({
    ...base,
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    cancelButtonText: "Cancel",
    draggable: true,
  });
  return r.isConfirmed;
}

export { Swal };
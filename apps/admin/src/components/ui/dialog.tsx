import { Modal, type ModalProps, Typography } from "antd";
import { X } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, useContext } from "react";

const Context = createContext({ open: false, onOpenChange: (_open: boolean) => {} });
export function Dialog({
  open = false,
  onOpenChange = () => {},
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  return <Context.Provider value={{ open, onOpenChange }}>{children}</Context.Provider>;
}
export function DialogContent({
  children,
  className,
  mask,
  keyboard,
}: ComponentProps<"div"> & Pick<ModalProps, "mask" | "keyboard">) {
  const { open, onOpenChange } = useContext(Context);
  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      mask={mask}
      keyboard={keyboard}
      footer={null}
      closeIcon={<X size={18} />}
      width={640}
      className={className}
      destroyOnHidden
    >
      {children}
    </Modal>
  );
}
export function DialogHeader(props: ComponentProps<"div">) {
  return <div {...props} className={`mb-5 pr-6 ${props.className || ""}`} />;
}
export function DialogTitle(props: ComponentProps<"h2">) {
  return <h2 {...props} className="text-lg font-semibold" />;
}
export function DialogDescription(props: ComponentProps<typeof Typography.Paragraph>) {
  return <Typography.Paragraph type="secondary" {...props} />;
}
export function DialogFooter(props: ComponentProps<"div">) {
  return <div {...props} className={`mt-6 flex justify-end gap-2 ${props.className || ""}`} />;
}

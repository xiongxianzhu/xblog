import { Card as AntCard, Typography } from "antd";
import type { ComponentProps } from "react";

type Props = ComponentProps<"div">;
export function Card(props: Props) {
  return (
    <AntCard className={props.className} style={props.style}>
      {props.children}
    </AntCard>
  );
}
export function CardHeader(props: Props) {
  return <div {...props} className={`mb-4 space-y-1 ${props.className || ""}`} />;
}
export function CardContent(props: Props) {
  return <div {...props} />;
}
export function CardTitle(props: Props) {
  return <div {...props} className={`text-base font-semibold ${props.className || ""}`} />;
}
export function CardDescription(props: Props) {
  return (
    <Typography.Paragraph type="secondary" className={props.className}>
      {props.children}
    </Typography.Paragraph>
  );
}
export const CardFooter = CardContent;

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

/** Lets a component take `render={<Link to=… />}` (the old Base UI way): the given element becomes the root, with our props and children. */
export function withRender<P extends { render?: React.ReactElement; children?: React.ReactNode }>(Tag: any, props: P & Record<string, any>) {
  const { render, children, ...rest } = props;
  if (render && React.isValidElement(render)) return <Slot {...rest}>{React.cloneElement(render as React.ReactElement<any>, undefined, children)}</Slot>;
  return <Tag {...rest}>{children}</Tag>;
}

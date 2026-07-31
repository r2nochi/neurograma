"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
};

type State = {
  fallo: boolean;
};

/**
 * Si el GLB no puede descargarse o decodificarse, la experiencia no se rompe:
 * React Three Fiber conserva la pieza procedural y todas sus interacciones.
 */
export class LimiteModelo extends Component<Props, State> {
  state: State = { fallo: false };

  static getDerivedStateFromError(): State {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("No se pudo montar el modelo anatómico.", error, info);
    }
  }

  render() {
    return this.state.fallo ? this.props.fallback : this.props.children;
  }
}

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface State { failed: boolean }

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Storefront render error", error, info.componentStack);
  }

  render() {
    if (this.state.failed) return <main className="wrap error-page" role="alert"><span className="eyebrow">ĐÃ CÓ SỰ CỐ</span><h1>Trang chưa thể hiển thị.</h1><p>Vui lòng trở về trang chủ và thử lại.</p><Link to="/" className="button button-dark">Về trang chủ</Link></main>;
    return this.props.children;
  }
}

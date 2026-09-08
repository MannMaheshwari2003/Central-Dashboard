import React from "react";

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected application error." };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("Dashboard render error", error, info);
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="error-state" role="alert">
        <div className="error-state__icon"><i className="fa fa-exclamation-triangle" aria-hidden="true" /></div>
        <h1>Dashboard could not render this view</h1>
        <p>The application encountered an unexpected UI error. Reload the page and try again.</p>
        {this.state.message && <code>{this.state.message}</code>}
        <button type="button" className="btn btn-primary btn-sm" onClick={this.handleReload}>Reload dashboard</button>
      </main>
    );
  }
}

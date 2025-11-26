import React from "react";

export default function SignupPage({ onSubmit, onBackClick }) {
  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">SURE SHOT</h1>
          <p className="login-subtitle">アカウントを作成して予約を開始しましょう</p>

          <form className="login-form" onSubmit={onSubmit}>
            <label className="login-label">
              メールアドレス
              <input
                className="login-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="login-label">
              パスワード
              <input
                className="login-input"
                type="password"
                name="password"
                placeholder="********"
                required
              />
            </label>

            <label className="login-label">
              パスワード（確認）
              <input
                className="login-input"
                type="password"
                name="confirm"
                placeholder="********"
                required
              />
            </label>

            <button className="login-button" type="submit">
              新規登録
            </button>
          </form>

          <button type="button" className="login-back-button" onClick={onBackClick}>
            ← ログイン画面に戻る
          </button>
        </div>
      </div>
    </div>
  );
}


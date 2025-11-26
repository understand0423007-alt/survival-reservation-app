import React from "react";

export default function LoginPage({ onSubmit, onSignupClick, onBackClick }) {
  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">SURE SHOT</h1>
          <p className="login-subtitle">予約するにはログインしてください</p>

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

            <button className="login-button" type="submit">
              ログイン
            </button>
          </form>

          <button type="button" className="signup-button" onClick={onSignupClick}>
            新規登録
          </button>

          <button type="button" className="login-back-button" onClick={onBackClick}>
            ← カレンダーに戻る
          </button>
        </div>
      </div>
    </div>
  );
}


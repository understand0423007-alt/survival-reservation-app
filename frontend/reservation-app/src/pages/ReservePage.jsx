import React from "react";

function ReserveSummaryRow({ label, value }) {
  return (
    <div className="reserve-summary-row">
      <span className="reserve-summary-label">{label}</span>
      <span className="reserve-summary-value">{value}</span>
    </div>
  );
}

function ReserveConfirmView({
  data,
  onEdit,
  onConfirm,
  onBackToCalendar,
}) {
  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">予約内容の確認</h1>
          <p className="login-subtitle">以下の内容で予約してよろしいですか？</p>

          <div className="reserve-summary">
            <ReserveSummaryRow label="名前" value={data.name} />
            <ReserveSummaryRow label="メール" value={data.email} />
            <ReserveSummaryRow label="参加チーム名" value={data.groupName} />
            <ReserveSummaryRow label="人数" value={`${data.peopleCount} 名`} />
            <ReserveSummaryRow label="レンタル装備" value={data.rentalNeeded ? "必要" : "不要"} />
            <ReserveSummaryRow label="参加区分" value={data.session} />
            <ReserveSummaryRow label="日付" value={data.date} />
            <ReserveSummaryRow label="時間" value={data.time} />
          </div>

          <div className="reserve-actions">
            <button type="button" className="reserve-edit-button" onClick={onEdit}>
              内容を修正する
            </button>
            <button type="button" className="reserve-confirm-button" onClick={onConfirm}>
              この内容で予約する
            </button>
          </div>

          <button type="button" className="login-back-button" onClick={onBackToCalendar}>
            ← カレンダーに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

function ReserveFormView({
  initialValues,
  onSubmit,
  onBackToCalendar,
}) {
  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">予約フォーム</h1>
          <p className="login-subtitle">以下の内容を入力して予約内容を確認してください</p>

          <form className="login-form" onSubmit={onSubmit}>
            <label className="login-label">
              名前
              <input
                className="login-input"
                type="text"
                name="name"
                placeholder="例）山田 太郎"
                defaultValue={initialValues.name}
                required
              />
            </label>

            <label className="login-label">
              メールアドレス
              <input
                className="login-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                defaultValue={initialValues.email}
                required
              />
            </label>

            <label className="login-label">
              参加チーム名
              <input
                className="login-input"
                type="text"
                name="groupName"
                placeholder="例）Red team"
                defaultValue={initialValues.groupName}
                required
              />
            </label>

            <label className="login-label">
              人数
              <input
                className="login-input"
                type="number"
                name="peopleCount"
                min={1}
                step={1}
                placeholder="例）5"
                defaultValue={initialValues.peopleCount}
                required
              />
            </label>

            <label className="login-label">
              レンタル装備
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "4px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <input
                    type="radio"
                    name="rentalNeeded"
                    value="yes"
                    defaultChecked={initialValues.rentalNeeded === true}
                    required
                  />
                  必要
                </label>
                <label
                  style={{
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <input
                    type="radio"
                    name="rentalNeeded"
                    value="no"
                    defaultChecked={
                      initialValues.rentalNeeded === false ||
                      initialValues.rentalNeeded === null
                    }
                  />
                  不要
                </label>
              </div>
            </label>

            <label className="login-label">
              日付
              <input
                className="login-input"
                type="date"
                name="date"
                defaultValue={initialValues.date}
                required
              />
            </label>

            <label className="login-label">
              時間
              <input
                className="login-input"
                type="time"
                name="time"
                defaultValue={initialValues.time}
                required
              />
            </label>

            <button className="login-button" type="submit">
              予約内容を確認する
            </button>
          </form>

          <button type="button" className="login-back-button" onClick={onBackToCalendar}>
            ← カレンダーに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReservePage({
  reserveStep,
  reserveData,
  initialValues,
  onSubmit,
  onConfirm,
  onEdit,
  onBackToCalendar,
}) {
  if (reserveStep === "confirm" && reserveData) {
    return (
      <ReserveConfirmView
        data={reserveData}
        onEdit={onEdit}
        onConfirm={onConfirm}
        onBackToCalendar={onBackToCalendar}
      />
    );
  }

  return (
    <ReserveFormView
      initialValues={initialValues}
      onSubmit={onSubmit}
      onBackToCalendar={onBackToCalendar}
    />
  );
}


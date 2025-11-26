import React from "react";

function GuardMessage({ title, subtitle }) {
  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">{title}</h1>
          <p className="login-subtitle">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function BusinessHoursPanel({
  openTime,
  closeTime,
  onOpenChange,
  onCloseChange,
  onSave,
  saving,
}) {
  return (
    <div
      style={{
        marginBottom: "12px",
        padding: "8px 10px",
        borderRadius: "8px",
        border: "1px solid #29593A",
        background: "rgba(4, 24, 14, 0.95)",
        fontSize: "12px",
      }}
    >
      <div
        style={{
          marginBottom: "6px",
          fontWeight: 600,
          color: "#A9D9A7",
        }}
      >
        営業時間設定
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ minWidth: "56px" }}>開店</span>
          <input
            type="time"
            value={openTime}
            onChange={(event) => onOpenChange(event.target.value)}
            style={{
              padding: "4px 6px",
              backgroundColor: "#02150e",
              border: "1px solid #1f5a33",
              color: "#E5F7E0",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ minWidth: "56px" }}>閉店</span>
          <input
            type="time"
            value={closeTime}
            onChange={(event) => onCloseChange(event.target.value)}
            style={{
              padding: "4px 6px",
              backgroundColor: "#02150e",
              border: "1px solid #1f5a33",
              color: "#E5F7E0",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            padding: "6px 12px",
            fontSize: "11px",
            borderRadius: "6px",
            border: "1px solid #2DD66B",
            background: "rgba(5, 36, 19, 0.95)",
            color: "#CFFFE1",
            cursor: "pointer",
            marginLeft: "4px",
          }}
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>

      <div
        style={{
          marginTop: "4px",
          color: "#7BAF7E",
          fontSize: "11px",
        }}
      >
        ※ 現在は予約フォームの時間制限には未反映（次のステップで反映可能）
      </div>
    </div>
  );
}

function SummaryBadges({ totalCount, checkedInCount, totalPeople }) {
  const badgeStyle = {
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid #29593A",
    fontSize: "11px",
    color: "#A9D9A7",
    backgroundColor: "#02150e",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        marginBottom: "8px",
        flexWrap: "wrap",
      }}
    >
      <div style={badgeStyle}>予約件数: {totalCount}件</div>
      <div style={badgeStyle}>チェックイン済: {checkedInCount}件</div>
      <div style={badgeStyle}>合計人数: {totalPeople}名</div>
    </div>
  );
}

function ReservationGroupTable({
  group,
  onToggleCheckIn,
  onDeleteReservation,
}) {
  const groupTotalPeople = group.list.reduce(
    (sum, reservation) => sum + (reservation.peopleCount || 0),
    0
  );

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#CFFFE1",
          borderLeft: "3px solid #3EF68A",
          paddingLeft: "8px",
          marginBottom: "4px",
        }}
      >
        {group.date}（合計 {groupTotalPeople}名）
      </div>

      <table
        style={{
          width: "100%",
          fontSize: "12px",
          borderCollapse: "collapse",
          backgroundColor: "rgba(2,21,14,0.9)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr>
            {["時間", "チーム名", "名前", "メール", "人数", "状態", "操作"].map(
              (header) => (
                <th
                  key={header}
                  style={{
                    borderBottom: "1px solid #29593A",
                    padding: "4px 6px",
                    textAlign: header === "人数" ? "right" : "left",
                    color: "#A9D9A7",
                  }}
                >
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {group.list.map((reservation, index) => {
            const rowBg = reservation.checkedIn
              ? "#062917"
              : index % 2 === 0
              ? "#02150e"
              : "transparent";

            return (
              <tr key={reservation.id} style={{ backgroundColor: rowBg }}>
                <td style={{ padding: "4px 6px" }}>
                  {reservation.session
                    ? `${reservation.time}（${reservation.session}）`
                    : reservation.time}
                </td>
                <td style={{ padding: "4px 6px", fontWeight: "bold" }}>
                  {reservation.team}
                </td>
                <td style={{ padding: "4px 6px" }}>{reservation.name}</td>
                <td
                  style={{
                    padding: "4px 6px",
                    maxWidth: "180px",
                    wordBreak: "break-all",
                  }}
                >
                  {reservation.email}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {reservation.peopleCount ? `${reservation.peopleCount}名` : "-"}
                </td>
                <td style={{ padding: "4px 6px" }}>
                  {reservation.checkedIn ? (
                    <span className="status-badge checked">チェックイン済</span>
                  ) : (
                    <span className="status-badge">未チェックイン</span>
                  )}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <button
                    type="button"
                    className="reserve-edit-button"
                    onClick={() =>
                      onToggleCheckIn(reservation.id, reservation.checkedIn)
                    }
                    style={{ marginRight: "6px" }}
                  >
                    {reservation.checkedIn ? "戻す" : "チェックイン"}
                  </button>
                  <button
                    type="button"
                    className="reserve-edit-button"
                    onClick={() => onDeleteReservation(reservation.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage({
  adminAuthChecked,
  isAdminAuthorized,
  adminSearchTerm,
  onSearchTermChange,
  businessOpenTime,
  businessCloseTime,
  onBusinessOpenChange,
  onBusinessCloseChange,
  onSaveBusinessHours,
  businessHoursSaving,
  summary,
  groupedReservations,
  onToggleCheckIn,
  onDeleteReservation,
  onBackToCalendar,
}) {
  if (!adminAuthChecked) {
    return <GuardMessage title="管理者ページ" subtitle="権限を確認しています..." />;
  }

  if (!isAdminAuthorized) {
    return (
      <GuardMessage title="管理者ページ" subtitle="ログイン画面へ移動しています..." />
    );
  }

  return (
    <div className="app">
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">予約一覧（管理者）</h1>
          <p className="login-subtitle">予約の検索・チェックイン・削除ができます</p>

          <BusinessHoursPanel
            openTime={businessOpenTime}
            closeTime={businessCloseTime}
            onOpenChange={onBusinessOpenChange}
            onCloseChange={onBusinessCloseChange}
            onSave={onSaveBusinessHours}
            saving={businessHoursSaving}
          />

          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="名前 / メール / チーム名 / 日付 で検索..."
              value={adminSearchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "12px",
                minWidth: "200px",
                flex: "1 1 220px",
                backgroundColor: "#021b12",
                border: "1px solid #1f5a33",
                color: "#A9D9A7",
              }}
            />
          </div>

          <SummaryBadges
            totalCount={summary.totalCount}
            checkedInCount={summary.checkedInCount}
            totalPeople={summary.totalPeople}
          />

          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {groupedReservations.length === 0 ? (
              <div
                style={{
                  padding: "8px 6px",
                  textAlign: "center",
                  color: "#A9D9A7",
                  fontSize: "12px",
                }}
              >
                該当する予約がありません
              </div>
            ) : (
              groupedReservations.map((group) => (
                <ReservationGroupTable
                  key={group.date}
                  group={group}
                  onToggleCheckIn={onToggleCheckIn}
                  onDeleteReservation={onDeleteReservation}
                />
              ))
            )}
          </div>

          <button type="button" className="login-back-button" onClick={onBackToCalendar}>
            ← カレンダーに戻る
          </button>
        </div>
      </div>
    </div>
  );
}


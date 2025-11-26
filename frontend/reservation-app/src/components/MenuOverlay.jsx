import React from "react";

export default function MenuOverlay({
  isOpen,
  menuRef,
  onToggle,
  onNavigateTop,
  onNavigateLogin,
}) {
  return (
    <div className="floating-dropdown-wrapper" ref={menuRef}>
      <button
        className="floating-menu-button"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        MENU
      </button>

      <div
        className={`floating-menu-panel${isOpen ? " open" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="floating-menu-item"
          onClick={() => {
            onNavigateTop();
          }}
        >
          TOP
        </button>
        <button
          type="button"
          className="floating-menu-item"
          onClick={() => {
            onNavigateLogin();
          }}
        >
          LOGIN
        </button>
      </div>
    </div>
  );
}


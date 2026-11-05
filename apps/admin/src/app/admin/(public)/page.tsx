import { Suspense } from "react";

import { AdminLoginScreen } from "@/components/admin/admin-login-screen";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <svg
        className="login-contours"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <path
            id="login-contour"
            d="M-240 530 C60 600 140 120 410 220 S780 590 1060 330 S1440 80 1710 210"
          />
        </defs>
        <g className="login-contours-far">
          {Array.from({ length: 12 }, (_, i) => -230 + i * 13).map((offset) => (
            <use key={offset} href="#login-contour" transform={`translate(0 ${offset})`} />
          ))}
        </g>
        <g transform="rotate(180 720 450)">
          <g className="login-contours-near">
            {Array.from({ length: 16 }, (_, i) => -170 + i * 12).map((offset) => (
              <use key={offset} href="#login-contour" transform={`translate(0 ${offset})`} />
            ))}
          </g>
        </g>
      </svg>
      <AdminLoginScreen />
    </Suspense>
  );
}

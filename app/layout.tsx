import type { Metadata } from "next";
import { JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell, SidebarProvider } from "@/components/sidebar";
import { ActivityProvider } from "@/components/activity-dock";
import { ServerEventsProvider } from "@/components/server-events";
import { AppearanceProvider } from "@/components/settings/appearance";
import UpdateBanner from "@/components/update-banner";

// Chrome = JetBrains Mono, teaching prose = Source Sans 3, titles = CMU
// Serif (the bundled lh-cmu @font-face in globals.css — no CDN).
const ui = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jetbrains" });
const prose = Source_Sans_3({ subsets: ["latin", "cyrillic"], variable: "--font-sans3" });

export const metadata: Metadata = {
	title: "Learning Harness",
	description: "Учитель с памятью — сессии, проверки и граф того, что вы уже знаете.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru" className={`dark ${ui.variable} ${prose.variable}`}>
			<body className="min-h-dvh antialiased">
			{/* The Cursor browser stamps data-cursor-ref onto the live DOM.
			    Next hydrates only after `await`ing the flight stream, which is
			    after window "load", so an observer that disconnects on load
			    loses the race. React's hydration walk reads `element.attributes`
			    synchronously — strip the stamp inside that getter, in the same
			    turn, before the mismatch check. getAttribute and querySelector
			    are left alone so later stamps still address elements. */}
			{process.env.NODE_ENV !== "production" && (
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){var names=["data-cursor-ref","data-cursor-element-id"];var proto=Element.prototype;var desc=Object.getOwnPropertyDescriptor(proto,"attributes");if(!desc||typeof desc.get!=="function")return;function strip(el){for(var i=0;i<names.length;i++)if(el.hasAttribute(names[i]))el.removeAttribute(names[i])}Object.defineProperty(proto,"attributes",{configurable:true,enumerable:!!desc.enumerable,get:function(){strip(this);return desc.get.call(this)}})})();`,
					}}
				/>
			)}
			{/* The notification channel rides OUTSIDE everything: sidebar, dock,
				 and pages all subscribe as the polls retire (push S3, 2026-10-02). */}
			<ServerEventsProvider>
				<AppearanceProvider>
					<SidebarProvider>
						<ActivityProvider>
							<AppShell>{children}</AppShell>
						</ActivityProvider>
					</SidebarProvider>
				</AppearanceProvider>
			</ServerEventsProvider>
			{/* Auto-update banner (Wave C): fixed card, Electron-only pushes. */}
			<UpdateBanner />
		</body>
		</html>
	);
}

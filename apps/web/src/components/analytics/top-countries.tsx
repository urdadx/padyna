import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpandIcon } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import BarList from "./bar-list";
import { ViewAllStats } from "./view-all-stats";
import { trpc } from "@/utils/trpc";
import { TopSkeleton } from "./top-skeleton";
import { DesktopIconLinear } from "@/assets/icons/desktop-icon";
import { MobilePhoneLinear } from "@/assets/icons/mobilephone-icon";
import { TabletIconLinear } from "@/assets/icons/tablet-icon";
import { QuestionCircleIcon } from "@/assets/icons/question-circle-icon";

export const TIME_RANGE_ITEMS = [
	{ label: "Last 24 hours", value: "24h" },
	{ label: "Last 7 days", value: "7d" },
	{ label: "Last 30 days", value: "30d" },
	{ label: "Last 3 months", value: "90d" },
] as const;

export type TimeRange = (typeof TIME_RANGE_ITEMS)[number]["value"];

export function TopCountries() {
	const [countriesDialogOpen, setCountriesDialogOpen] = useState(false);
	const [devicesDialogOpen, setDevicesDialogOpen] = useState(false);
	const [osDialogOpen, setOsDialogOpen] = useState(false);

	const { timeRange } = useSearch({ from: "/(admin)/analytics" });
	const selectedTimeRange: TimeRange = (timeRange as TimeRange) || "24h";

	const countriesQuery = useQuery(
		trpc.analytics.getTopCountries.queryOptions({
			timeRange: selectedTimeRange,
			limit: 10,
		}),
	);

	const devicesQuery = useQuery(
		trpc.analytics.getTopDevices.queryOptions({
			timeRange: selectedTimeRange,
			limit: 10,
		}),
	);

	const osQuery = useQuery(
		trpc.analytics.getTopOS.queryOptions({
			timeRange: selectedTimeRange,
			limit: 10,
		}),
	);

	const isPending = countriesQuery.isPending || devicesQuery.isPending || osQuery.isPending;

	const osCodeMap: Record<string, string> = {
		iOS: "IOS",
		Android: "AND",
		macOS: "MAC",
		Windows: "WIN",
		Linux: "LIN",
		unknown: "SYS",
	};

	const mapCountries = (countriesQuery.data ?? []).map((c) => ({
		icon: (
			<img
				src={`https://flag.vercel.app/m/${c.countryCode}.svg`}
				className="w-4"
				alt={c.countryCode}
			/>
		),
		title: c.country,
		value: c.value,
		href: "",
		linkId: "",
	}));

	const mapDevices = (devicesQuery.data ?? []).map((d) => ({
		icon:
			d.deviceType === "mobile" ? (
				<MobilePhoneLinear color="black" className="w-4 " />
			) : d.deviceType === "desktop" ? (
				<DesktopIconLinear color="black" className="w-4" />
			) : d.deviceType === "tablet" ? (
				<TabletIconLinear color="black" className="w-4" />
			) : (
				<QuestionCircleIcon color="black" className="w-4" />
			),
		title: d.deviceType,
		value: d.count,
		href: "",
	}));

	const mapOS = (osQuery.data ?? []).map((o) => ({
		icon: <img src={`/os/${osCodeMap[o.os] || "SYS"}.png`} className="w-4" alt={o.os} />,
		title: o.os === "unknown" ? "Unknown" : o.os,
		value: o.count,
		href: "",
	}));

	const topCountries = mapCountries.slice(0, 5);
	const topDevices = mapDevices.slice(0, 5);
	const topOS = mapOS.slice(0, 5);

	const maxCountryCount = Math.max(...mapCountries.map((c) => c.value), 0);
	const maxDeviceCount = Math.max(...mapDevices.map((d) => d.value), 0);
	const maxOSCount = Math.max(...mapOS.map((o) => o.value), 0);

	const hasData = mapCountries.length > 0 || mapDevices.length > 0 || mapOS.length > 0;

	if (isPending) {
		return <TopSkeleton />;
	}

	return (
		<div className="h-87.5 w-full z-0 rounded-xl border bg-white flex flex-col overflow-hidden">
			<Tabs defaultValue="countries" className="flex flex-col h-full">
				<div className="flex items-center justify-between px-4 py-3 shrink-0">
					<TabsList className="h-auto gap-2 rounded-none border-border bg-transparent px-0 text-foreground">
						<TabsTrigger
							value="countries"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							Countries
						</TabsTrigger>
						<TabsTrigger
							value="devices"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							Devices
						</TabsTrigger>
						<TabsTrigger
							value="os"
							className="relative text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary data-[state=active]:hover:bg-accent">
							OS
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 min-h-0 overflow-hidden">
					<TabsContent value="countries" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							{!hasData ? (
								<div className="flex flex-col items-center justify-center h-full min-h-48 text-center">
									<p className="text-muted-foreground text-sm">
										No data available yet
									</p>
								</div>
							) : (
								<>
									<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden">
										<BarList
											tab="Countries"
											unit="visits"
											data={topCountries}
											barBackground="bg-green-200"
											hoverBackground="hover:bg-green-50"
											maxValue={maxCountryCount}
											limit={5}
										/>
									</div>
								</>
							)}
							{mapCountries.length > 5 && (
								<div className="shrink-0 px-4 py-3 ">
									<div className="flex items-center justify-center">
										<Button
											variant="outline"
											onClick={() =>
												setCountriesDialogOpen(true)
											}
											className="text-muted-foreground"
											size="sm">
											<ExpandIcon className="h-4 w-4 mr-1" />
											View all
										</Button>
									</div>
								</div>
							)}
						</div>
						<ViewAllStats
							name="countries"
							dialogOpen={countriesDialogOpen}
							setDialogOpen={setCountriesDialogOpen}
							allLinks={mapCountries}
							maxTotalCount={maxCountryCount}
							bgColor="bg-green"
						/>
					</TabsContent>

					<TabsContent value="devices" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							{!hasData ? (
								<div className="flex flex-col items-center justify-center h-full min-h-48 text-center">
									<p className="text-muted-foreground text-sm">
										No data available yet
									</p>
								</div>
							) : (
								<>
									<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden">
										<BarList
											tab="Devices"
											unit="visits"
											data={topDevices}
											barBackground="bg-green-200"
											hoverBackground="hover:bg-green-50"
											maxValue={maxDeviceCount}
											limit={5}
										/>
									</div>
								</>
							)}
							{hasData && mapDevices.length > 5 && (
								<div className="shrink-0 px-4 py-3 ">
									<div className="flex items-center justify-center">
										<Button
											variant="outline"
											onClick={() =>
												setDevicesDialogOpen(true)
											}
											size="sm"
											className="text-muted-foreground">
											<ExpandIcon className="h-4 w-4 mr-1" />
											View all
										</Button>
									</div>
								</div>
							)}
						</div>
						<ViewAllStats
							name="devices"
							dialogOpen={devicesDialogOpen}
							setDialogOpen={setDevicesDialogOpen}
							allLinks={mapDevices}
							maxTotalCount={maxDeviceCount}
							bgColor="bg-green"
						/>
					</TabsContent>

					<TabsContent value="os" className="h-full m-0 p-0">
						<div className="h-full flex flex-col">
							{!hasData ? (
								<div className="flex flex-col items-center justify-center h-full min-h-48 text-center">
									<p className="text-muted-foreground text-sm">
										No data available yet
									</p>
								</div>
							) : (
								<>
									<div className="flex-1 min-h-0 px-4 pt-4 overflow-hidden">
										<BarList
											tab="OS"
											unit="visits"
											data={topOS}
											barBackground="bg-green-200"
											hoverBackground="hover:bg-green-50"
											maxValue={maxOSCount}
											limit={5}
										/>
									</div>
								</>
							)}
							{hasData && mapOS.length > 5 && (
								<div className="shrink-0 px-4 py-3 ">
									<div className="flex items-center justify-center">
										<Button
											variant="outline"
											onClick={() =>
												setOsDialogOpen(true)
											}
											size="sm"
											className="text-muted-foreground">
											<ExpandIcon className="h-4 w-4 mr-1" />
											View all
										</Button>
									</div>
								</div>
							)}
						</div>
						<ViewAllStats
							name="os"
							dialogOpen={osDialogOpen}
							setDialogOpen={setOsDialogOpen}
							allLinks={mapOS}
							maxTotalCount={maxOSCount}
							bgColor="bg-green"
						/>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}

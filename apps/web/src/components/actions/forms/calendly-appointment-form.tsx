import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addHours, format, setHours, setMinutes } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";

export type CalendlyAppointmentFormPayload = {
	kind: "calendly_appointment_form";
	actionId: string;
	chatbotId: string;
	title?: string;
	helperText?: string;
	eventTypeUri: string;
	eventTypeName: string;
	schedulingUrl: string | null;
	duration: number | null;
	inviteeEmail?: string;
	inviteeName?: string;
};

interface AppointmentPickerProps {
	schedulingUrl?: string | null;
	eventTypeName?: string;
	onConfirm?: (payload: {
		date: Date;
		start: string;
		end: string;
		calendlyUrl: string;
	}) => void;
}

function isCalendlyAppointmentFormPayload(value: unknown): value is CalendlyAppointmentFormPayload {
	if (!value || typeof value !== "object") {
		return false;
	}

	const payload = value as Record<string, unknown>;

	return (
		payload.kind === "calendly_appointment_form" &&
		typeof payload.actionId === "string" &&
		typeof payload.chatbotId === "string" &&
		typeof payload.eventTypeUri === "string" &&
		typeof payload.eventTypeName === "string"
	);
}

export function getCalendlyAppointmentFormPayloads(
	parts: Array<{ output?: unknown; state?: string }>,
) {
	return parts.flatMap((part) => {
		if (part.state !== "output-available") {
			return [];
		}

		return isCalendlyAppointmentFormPayload(part.output) ? [part.output] : [];
	});
}

function buildCalendlyUrl(args: {
	schedulingUrl?: string | null;
	date: Date;
	hour: number;
	minute: number;
}) {
	if (!args.schedulingUrl) {
		return null;
	}

	const selectedDateTime = setMinutes(setHours(new Date(args.date), args.hour), args.minute);
	const isoDateTime = selectedDateTime.toISOString().replace(/\.000Z$/, "+00:00");

	return `${args.schedulingUrl.replace(/\/$/, "")}/${isoDateTime}`;
}

export function AppointmentPicker({
	schedulingUrl,
	eventTypeName,
	onConfirm,
}: AppointmentPickerProps) {
	const today = new Date();
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number } | null>(
		null,
	);
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);

	const timeSlots = useMemo(() => {
		const slots = [];
		for (let hour = 9; hour < 17; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				slots.push({
					hour,
					minute,
					label: format(
						setMinutes(setHours(new Date(), hour), minute),
						"HH:mm",
					),
				});
			}
		}
		return slots;
	}, []);

	const selectedTimeLabel = useMemo(() => {
		if (!selectedTime) return null;
		return format(
			setMinutes(setHours(new Date(), selectedTime.hour), selectedTime.minute),
			"HH:mm",
		);
	}, [selectedTime]);

	const isPastSelection = useMemo(() => {
		if (!date || !selectedTime) return false;
		const dt = setMinutes(setHours(new Date(date), selectedTime.hour), selectedTime.minute);
		return dt < new Date();
	}, [date, selectedTime]);

	return (
		<div>
			<div className="w-75 rounded-md border">
				{showConfirmation ? (
					<div className="p-8 text-center">
						<p className="mb-2 text-md">
							Preferred time for{" "}
							<span>{eventTypeName || "meeting"}</span>
							{date ? ` on ${format(date, "EEE, MMMM d")}` : ""}
							{selectedTimeLabel ? ` at ${selectedTimeLabel}` : ""}
						</p>
						<p className="mb-4 text-xs text-muted-foreground">
							You&apos;ll finish the booking on Calendly in the next
							step.
						</p>
						{isPastSelection ? (
							<p className="mb-4 text-xs text-amber-600">
								The selected time is in the past. Please pick a
								future time.
							</p>
						) : null}
						<div className="flex flex-col gap-2">
							<Button
								className="w-full"
								onClick={() => {
									if (!date || !selectedTime) {
										return;
									}

									const selectedDateTime = setMinutes(
										setHours(
											new Date(date),
											selectedTime.hour,
										),
										selectedTime.minute,
									);
									const endDateTime = addHours(
										selectedDateTime,
										1,
									);
									const calendlyUrl = buildCalendlyUrl({
										schedulingUrl,
										date,
										hour: selectedTime.hour,
										minute: selectedTime.minute,
									});

									if (!calendlyUrl) {
										return;
									}

									onConfirm?.({
										date,
										start: selectedDateTime.toISOString(),
										end: endDateTime.toISOString(),
										calendlyUrl,
									});
								}}
								disabled={!selectedTime || !date || !schedulingUrl}>
								Continue to Calendly
							</Button>
							<Button
								variant="ghost"
								className=" w-full"
								onClick={() => {
									setShowConfirmation(false);
									setShowTimePicker(true);
								}}>
								<ArrowLeft className="h-4 w-4" />
								Change time
							</Button>
						</div>
					</div>
				) : !showTimePicker ? (
					<div className="w-full p-2">
						<Calendar
							mode="single"
							selected={date}
							modifiers={{ weekend: { dayOfWeek: [0, 6] } }}
							modifiersClassNames={{
								weekend: "line-through opacity-60",
							}}
							onSelect={(newDate) => {
								if (!newDate) {
									return;
								}

								setDate(newDate);
								setSelectedTime(null);
								setShowTimePicker(true);
							}}
							className="w-full"
							disabled={[{ before: today }]}
						/>
						{!schedulingUrl ? (
							<p className="px-2 pb-2 text-xs text-muted-foreground">
								This Calendly event type does not have a public
								scheduling link.
							</p>
						) : null}
					</div>
				) : (
					<div className="p-4">
						<div className="mb-4 flex items-center justify-between">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowTimePicker(false)}>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<p className="text-center text-sm font-medium">
								{date ? format(date, "EEEE, MMMM d") : null}
							</p>
							<div className="w-8" />
						</div>
						<ScrollArea className="h-fit w-full">
							<div className="grid gap-1.5 sm:grid-cols-2">
								{timeSlots.map(({ hour, minute, label }) => (
									<Button
										key={`${hour}-${minute}`}
										variant={
											selectedTime?.hour === hour &&
											selectedTime?.minute === minute
												? "default"
												: "outline"
										}
										size="sm"
										className="w-full"
										onClick={() => {
											setSelectedTime({ hour, minute });
											setShowConfirmation(true);
										}}>
										{label}
									</Button>
								))}
							</div>
						</ScrollArea>
					</div>
				)}
			</div>
		</div>
	);
}

type CalendlyAppointmentFormProps = {
	payload: CalendlyAppointmentFormPayload;
};

export function CalendlyAppointmentForm({ payload }: CalendlyAppointmentFormProps) {
	return (
		<AppointmentPicker
			schedulingUrl={payload.schedulingUrl}
			eventTypeName={payload.eventTypeName}
			onConfirm={({ calendlyUrl }) => {
				window.open(calendlyUrl, "_blank", "noopener,noreferrer");
			}}
		/>
	);
}

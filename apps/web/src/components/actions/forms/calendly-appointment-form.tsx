import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addHours, format, setHours, setMinutes } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
	calendlyAppointmentFormOutputSchema,
	collectToolOutputs,
	type CalendlyAppointmentFormOutput,
} from "@padyna/api/actions/contracts";

export type CalendlyAppointmentFormPayload = CalendlyAppointmentFormOutput;

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

export function getCalendlyAppointmentFormPayloads(
	parts: Array<{ output?: unknown; state?: string }>,
) {
	return collectToolOutputs(parts, calendlyAppointmentFormOutputSchema);
}

const TIME_LABEL_REFERENCE_DATE = new Date(Date.UTC(2000, 0, 1));

function getSelectedDateTime(date: Date, hour: number, minute: number) {
	return setMinutes(setHours(new Date(date), hour), minute);
}

function getTimeLabel(hour: number, minute: number) {
	return format(
		setMinutes(setHours(new Date(TIME_LABEL_REFERENCE_DATE), hour), minute),
		"HH:mm",
	);
}

function getStartOfDay(date: Date) {
	const value = new Date(date);
	value.setHours(0, 0, 0, 0);
	return value;
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

	const selectedDateTime = getSelectedDateTime(args.date, args.hour, args.minute);
	const isoDateTime = selectedDateTime.toISOString().replace(/\.000Z$/, "+00:00");

	return `${args.schedulingUrl.replace(/\/$/, "")}/${isoDateTime}`;
}

type AppointmentPickerState = {
	date: Date | undefined;
	selectedTime: { hour: number; minute: number } | null;
	showConfirmation: boolean;
	showTimePicker: boolean;
};

function appointmentPickerReducer(
	state: AppointmentPickerState,
	action: Partial<AppointmentPickerState>,
) {
	return { ...state, ...action };
}

export function AppointmentPicker({
	schedulingUrl,
	eventTypeName,
	onConfirm,
}: AppointmentPickerProps) {
	const [currentDate, setCurrentDate] = useState<Date | null>(null);
	const [state, updateState] = useReducer(appointmentPickerReducer, {
		date: undefined,
		selectedTime: null,
		showConfirmation: false,
		showTimePicker: false,
	});
	const { date, selectedTime, showConfirmation, showTimePicker } = state;

	useEffect(() => {
		setCurrentDate(new Date());
	}, []);

	const today = useMemo(
		() => (currentDate ? getStartOfDay(currentDate) : undefined),
		[currentDate],
	);

	const timeSlots = useMemo(() => {
		const slots = [];
		for (let hour = 9; hour < 17; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				slots.push({ hour, minute, label: getTimeLabel(hour, minute) });
			}
		}
		return slots;
	}, []);

	const selectedTimeLabel = useMemo(() => {
		if (!selectedTime) return null;
		return getTimeLabel(selectedTime.hour, selectedTime.minute);
	}, [selectedTime]);

	const isPastSelection = useMemo(() => {
		if (!date || !selectedTime || !currentDate) return false;
		const dt = getSelectedDateTime(date, selectedTime.hour, selectedTime.minute);
		return dt < currentDate;
	}, [currentDate, date, selectedTime]);

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

									const selectedDateTime = getSelectedDateTime(
										date,
										selectedTime.hour,
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
									updateState({
										showConfirmation: false,
										showTimePicker: true,
									});
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

								updateState({
									date: newDate,
									selectedTime: null,
									showTimePicker: true,
								});
							}}
							className="w-full"
							disabled={today ? [{ before: today }] : undefined}
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
								onClick={() => updateState({ showTimePicker: false })}>
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
											updateState({
												selectedTime: { hour, minute },
												showConfirmation: true,
											});
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

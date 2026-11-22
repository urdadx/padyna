import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { endOfDay, format, startOfDay } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Spinner from "@/components/ui/spinner";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";
import {
	calAppointmentFormOutputSchema,
	collectToolOutputs,
	type CalAppointmentFormOutput,
} from "@padyna/api/actions/contracts";

export type CalAppointmentFormPayload = CalAppointmentFormOutput;

export function getCalAppointmentFormPayloads(parts: Array<{ output?: unknown; state?: string }>) {
	return collectToolOutputs(parts, calAppointmentFormOutputSchema);
}

interface CalAppointmentPickerProps {
	actionId?: string;
	username?: string;
	eventSlug?: string;
	duration?: number;
	onConfirm?: (payload: {
		date: Date;
		start: string;
		end: string;
		attendeeName: string;
		attendeeEmail: string;
		notes?: string;
	}) => void;
}

interface TimeSlot {
	time: string;
}

type CalBookingApiError = {
	error?: string;
	fields?: Record<string, string[]>;
	details?: unknown;
};

type CalBookingApiResponse = {
	confirmationFailed?: boolean;
};

function getStartOfCurrentDay(date: Date) {
	const value = new Date(date);
	value.setHours(0, 0, 0, 0);
	return value;
}

function formatSlotLabel(slotTime: string) {
	return format(new Date(slotTime), "HH:mm");
}

function formatBookingLabel(slotTime: string) {
	return format(new Date(slotTime), "EEEE, MMMM d 'at' HH:mm");
}

function getApiErrorMessage(error: unknown, fallbackMessage: string) {
	if (isAxiosError<CalBookingApiError>(error)) {
		const firstFieldError = error.response?.data?.fields
			? Object.values(error.response.data.fields)[0]?.[0]
			: undefined;

		return firstFieldError || error.response?.data?.error || fallbackMessage;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallbackMessage;
}

export function CalAppointmentPicker({
	actionId,
	username,
	eventSlug,
	duration = 30,
	onConfirm,
}: CalAppointmentPickerProps) {
	const [currentDate, setCurrentDate] = useState<Date | null>(null);
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [showAttendeeForm, setShowAttendeeForm] = useState(false);
	const [attendeeName, setAttendeeName] = useState("");
	const [attendeeEmail, setAttendeeEmail] = useState("");
	const [notes, setNotes] = useState("");
	const [isConfirming, setIsConfirming] = useState(false);
	const [confirmError, setConfirmError] = useState<string | null>(null);
	const [bookingResult, setBookingResult] = useState<{
		start: string;
		confirmationFailed: boolean;
	} | null>(null);

	useEffect(() => {
		setCurrentDate(new Date());
	}, []);

	const today = useMemo(
		() => (currentDate ? getStartOfCurrentDay(currentDate) : undefined),
		[currentDate],
	);

	const {
		data: slotsData,
		isLoading: loading,
		error,
		refetch,
	} = useQuery<{ slots: TimeSlot[] }>({
		queryKey: ["cal-slots", username, eventSlug, date?.toISOString()],
		queryFn: async () => {
			if (!date || !username || !eventSlug) {
				return { slots: [] };
			}

			const startTime = startOfDay(date).toISOString();
			const endTime = endOfDay(date).toISOString();

			const response = await api.get("/api/cal/slots", {
				params: {
					actionId,
					username,
					eventSlug,
					startTime,
					endTime,
				},
			});

			return response.data;
		},
		enabled: !!date && !!username && !!eventSlug,
		staleTime: 1000 * 60 * 5,
	});

	const timeSlots = slotsData?.slots || [];
	const slotItems = useMemo(
		() => timeSlots.map((slot) => ({ ...slot, label: formatSlotLabel(slot.time) })),
		[timeSlots],
	);
	const bookingResultLabel = useMemo(
		() => (bookingResult ? formatBookingLabel(bookingResult.start) : null),
		[bookingResult],
	);
	const selectedDateLabel = useMemo(
		() => (date ? format(date, "EEEE, MMMM d") : null),
		[date],
	);
	const attendeeTimeZone = useMemo(
		() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		[],
	);

	const handleConfirm = async () => {
		if (
			!date ||
			!selectedSlot ||
			!attendeeName ||
			!attendeeEmail ||
			!username ||
			!eventSlug
		) {
			setConfirmError("Missing booking details. Please select a slot and try again.");
			return;
		}

		setIsConfirming(true);
		setConfirmError(null);

		try {
			const selectedDateTime = new Date(selectedSlot);
			const endDateTime = new Date(selectedDateTime.getTime() + duration * 60000);
			const bookingPayload = {
				actionId,
				username,
				eventSlug,
				start: selectedDateTime.toISOString(),
				attendee: {
					name: attendeeName.trim(),
					email: attendeeEmail.trim(),
					timeZone: attendeeTimeZone,
				},
				...(notes.trim() ? { notes: notes.trim() } : {}),
			};

			const response = await api.post<CalBookingApiResponse>(
				"/api/cal/booking",
				bookingPayload,
			);

			setBookingResult({
				start: bookingPayload.start,
				confirmationFailed: Boolean(response.data.confirmationFailed),
			});

			try {
				onConfirm?.({
					date,
					start: selectedDateTime.toISOString(),
					end: endDateTime.toISOString(),
					attendeeName: attendeeName.trim(),
					attendeeEmail: attendeeEmail.trim(),
					notes: notes.trim() || undefined,
				});
			} catch (callbackError) {
				console.error("Cal appointment onConfirm callback failed", callbackError);
			}
		} catch (err) {
			const errorMessage = getApiErrorMessage(
				err,
				"Failed to confirm appointment. Please try again.",
			);
			setConfirmError(errorMessage);
		}

		setIsConfirming(false);
	};

	const isPastSelection = useMemo(() => {
		if (!selectedSlot || !currentDate) return false;
		return new Date(selectedSlot) < currentDate;
	}, [currentDate, selectedSlot]);

	return (
		<div>
			<div className="rounded-md border w-67.5">
				{bookingResult ? (
					<div className="p-4 text-center">
						<CheckMarkIcon color="green" className="mx-auto mb-2 w-8 h-8" />
						<p className="mb-2 text-sm font-medium">
							Your appointment has been confirmed.
						</p>
						<p className="mb-1 text-sm text-muted-foreground">{bookingResultLabel}</p>
						<p className="mb-4 text-xs text-muted-foreground">
							{bookingResult.confirmationFailed
								? "The booking was created, but Cal.com still needs to confirm it."
								: ""}
						</p>
					</div>
				) : showAttendeeForm ? (
					<div className="p-3 w-full">
						<div className="mb-4">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setShowAttendeeForm(false);
									setShowTimePicker(true);
								}}
								className="mb-2">
								<ArrowLeft className="h-4 w-4" />
								Back
							</Button>
						</div>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={attendeeName}
									onChange={(e) =>
										setAttendeeName(e.target.value)
									}
									placeholder="Enter your name"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={attendeeEmail}
									onChange={(e) =>
										setAttendeeEmail(e.target.value)
									}
									placeholder="your@email.com"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="notes">
									Additional Notes (Optional)
								</Label>
								<Textarea
									id="notes"
									className="w-full"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Any special requirements or notes..."
									rows={3}
								/>
							</div>

							{isPastSelection && (
								<p className="text-xs text-amber-600">
									The selected time is in the past. Please pick
									a future time.
								</p>
							)}

							{confirmError && (
								<p className="text-xs text-red-600">
									{confirmError}
								</p>
							)}

							<div className="flex gap-2">
								<Button
									className="flex-1"
									onClick={handleConfirm}
									disabled={
										!attendeeName ||
										!attendeeEmail ||
										isPastSelection ||
										isConfirming
									}>
									{isConfirming ? (
										<Spinner className="text-white" />
									) : (
										"Confirm"
									)}
								</Button>
							</div>
						</div>
					</div>
				) : !showTimePicker ? (
					<div className="p-2 w-full">
						<Calendar
							mode="single"
							selected={date}
							modifiers={{ weekend: { dayOfWeek: [0, 6] } }}
							modifiersClassNames={{
								weekend: "line-through opacity-60",
							}}
							onSelect={(newDate) => {
								if (newDate) {
									setDate(newDate);
									setSelectedSlot(null);
									setShowTimePicker(true);
								}
							}}
							className="w-full"
							disabled={today ? [{ before: today }] : undefined}
						/>
						{(!username || !eventSlug) && (
							<p className="px-2 pb-2 text-xs text-muted-foreground">
								Select an event type to view availability.
							</p>
						)}
					</div>
				) : (
					<div className="p-4">
						<div className="mb-4 flex items-center justify-between">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setShowTimePicker(false);
									setSelectedSlot(null);
								}}>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<p className="text-sm text-center font-medium">
								{selectedDateLabel}
							</p>
							<div className="w-8" />
						</div>

						{loading ? (
							<div className="flex items-center justify-center py-8">
								<Spinner />
							</div>
						) : error ? (
							<div className="py-8 text-center">
								<p className="text-sm text-red-500 mb-2">
									{getApiErrorMessage(
										error,
										"Failed to load available time slots. Please try again.",
									)}
								</p>
								<Button
									size="sm"
									variant="outline"
									onClick={() => refetch()}>
									Try Again
								</Button>
							</div>
						) : timeSlots.length === 0 ? (
							<div className="py-8 text-center">
								<p className="text-sm text-muted-foreground">
									No available slots for this date
								</p>
							</div>
						) : (
							<ScrollArea className="h-75 w-full">
								<div className="grid gap-1.5 sm:grid-cols-2">
									{slotItems.map((slot) => (
										<Button
											key={slot.time}
											variant={
												selectedSlot === slot.time
													? "default"
													: "outline"
											}
											size="sm"
											className="w-full"
											onClick={() => {
												setSelectedSlot(slot.time);
												setShowTimePicker(false);
												setShowAttendeeForm(true);
											}}>
											{slot.label}
										</Button>
									))}
								</div>
							</ScrollArea>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

type CalAppointmentFormProps = {
	payload: CalAppointmentFormPayload;
};

export function CalAppointmentForm({ payload }: CalAppointmentFormProps) {
	return (
		<CalAppointmentPicker
			actionId={payload.actionId}
			username={payload.username}
			eventSlug={payload.eventSlug}
		/>
	);
}

import InputWithStartAddon from "../Input-with-start";
import { Button } from "../ui/button";
import { Field, FieldGroup } from "../ui/field";
import { AvatarStack } from "./avatar-stack";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export const StepOne = ({ onContinue }: { onContinue: () => void }) => {
	return (
		<>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onContinue();
				}}
				className="p-6 md:p-12 flex flex-col items-center justify-center h-full max-w-lg mx-auto">
				<FieldGroup>
					<div className="flex flex-col gap-2 text-start">
						<AvatarStack className="mb-2" />
						<h1 className="text-3xl font-semibold">First things first</h1>
						<p className=" text-muted-foreground leading-relaxed">
							Let’s create your organization and quickly set up your AI
							agent.
						</p>
					</div>
					<Field className="mt-4">
						<Label htmlFor="organization-name">Organization name</Label>
						<Input placeholder="Google Inc." />
					</Field>
					<Field>
						<InputWithStartAddon />
					</Field>
					<Field>
						<Button type="submit">
							{/* <Spinner /> */}
							Continue
						</Button>
					</Field>
					<Field className="grid grid-cols-3 gap-4"></Field>
				</FieldGroup>
			</form>
		</>
	);
};

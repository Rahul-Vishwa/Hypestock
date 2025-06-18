interface InputProps {
    id: string;
    label: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    error?: boolean;
    errorMessage?: string;
    maxLength: number;
}
  

export default function Input(props: InputProps) {
    return <div className="flex flex-col gap-1">
        <label htmlFor={props.id}>{props.label}</label>
        <input 
            type={props.type} 
            id={props.id} 
            value={props.value} 
            onChange={props.onChange} 
            onBlur={props.onBlur} 
            maxLength={props.maxLength}
            className={`py-2 px-3 text-black rounded-sm outline-none ${props.error ? 'border-2 border-red-600' : 'border-2'}`} 
        />
    </div>
}
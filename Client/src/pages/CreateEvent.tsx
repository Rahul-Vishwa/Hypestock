import api from "../api/axios";
import Input from "../components/Input";
import { Controller, useForm } from "react-hook-form";

interface Form {
    title: string;
    description: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
}

export default function CreateEvent() {
    const { handleSubmit, control, formState: { touchedFields, isValid } } = useForm<Form>({
        defaultValues: {
            title: "",
            description: "",
            category: "Sports",
            date: new Date().toISOString().split('T')[0],
            startTime: "",
            endTime: "",
        }
    });
    const categories = [
        'Sports',
        'Technology',
        'Health',
        'Education',
        'Entertainment',
        'Music',
        'Business',
        'Finance',
        'Politics',
        'Travel',
        'Lifestyle',
        'Art',
        'Gaming',
        'Science',
        'Environment',
        'Food',
        'Fashion',
        'Literature',
        'Spirituality',
        'Fitness'
    ];

    function onSubmit(data: Form) {
        api.post('/event', data)
            .then(() => {
                control._reset();
            })
            .catch(error => {
                console.log(error);
            });
    };

    return (
        <>
            <div className="text-2xl font-bold">
                Create Event
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mt-10 grid grid-cols-6 gap-5 gap-y-8">
                    <div className="col-span-3">
                        <Controller
                            name="title"
                            control={control} 
                            rules={{ required: "Email is required" }}
                            render={({field}) => (
                                <Input 
                                    id="title" 
                                    label="Title" 
                                    type="text"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={touchedFields.title && !field.value}
                                    maxLength={100}
                                />
                            )}
                        />
                    </div>
                    <div className="flex flex-col gap-1 col-span-3">
                        <label htmlFor="Category">Category</label>
                        <Controller
                            name="category"
                            control={control} 
                            rules={{ required: "Category is required" }}
                            render={({field}) => (
                                <select 
                                    id="Category" 
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur} 
                                    className={`py-2 px-3 text-black rounded-sm outline-none ` + ((touchedFields.category && !field.value) ? 'border border-red-600' : 'border-2')}
                                >
                                    {categories.map(category => <option key={category} value={category}>{category}</option>)}
                                </select>
                            )}
                        />
                        
                    </div>
                    <div className="col-span-6">
                        <Controller
                            name="description"
                            control={control} 
                            rules={{ required: "Description is required" }}
                            render={({field}) => (
                                <Input 
                                    id="description" 
                                    label="Description" 
                                    type="text"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={(touchedFields.description && !field.value)}
                                    maxLength={200}
                                />
                            )}
                        />
                    </div>
                    <div className="col-span-2">
                        <Controller
                            name="date"
                            control={control} 
                            rules={{ required: "Description is required" }}
                            render={({field}) => (
                                <Input 
                                    id="date" 
                                    label="Date" 
                                    type="date"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={(touchedFields.date && !field.value)}
                                    maxLength={20}
                                />
                            )}
                        />
                    </div>
                    <div className="col-span-2">
                        <Controller
                            name="startTime"
                            control={control} 
                            rules={{ required: "Start time is required" }}
                            render={({field}) => (
                                <Input 
                                    id="startTime" 
                                    label="Start Time" 
                                    type="time"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={(touchedFields.startTime && !field.value)}
                                    maxLength={10}
                                />
                            )}
                        />
                    </div>
                    <div className="col-span-2">
                    <Controller
                            name="endTime"
                            control={control} 
                            rules={{ required: "End time is required" }}
                            render={({field}) => (
                                <Input 
                                    id="endTime" 
                                    label="End Time" 
                                    type="time"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={(touchedFields.endTime && !field.value)}
                                    maxLength={10}
                                />
                            )}
                        />
                    </div>

                    <div className="">
                        <button type="submit" disabled={!isValid} className={`bg-white text-black px-5 py-2 rounded-sm ${!isValid && 'bg-secondary cursor-not-allowed'}`}>Create</button>
                    </div>
                </div>
            </form>
        </>
    );
}
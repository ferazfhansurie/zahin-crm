import React, { useState } from 'react';
import { FormLabel } from "@/components/Base/Form";
import clsx from "clsx";
import KeywordSourceSelector from './KeywordSourceSelector';

interface TagResponseFormProps {
    availableTags: Array<{ id: string; name: string; }>;
    selectedTags: string[];
    onTagSelection: (tagId: string) => void;
    keywordSource: 'user' | 'bot';
    onKeywordSourceChange: (source: 'user' | 'bot') => void;
    tagActionMode: 'add' | 'delete';
    onTagActionModeChange: (mode: 'add' | 'delete') => void;
}

const TagResponseForm: React.FC<TagResponseFormProps> = ({ 
    availableTags, 
    selectedTags, 
    onTagSelection,
    keywordSource,
    onKeywordSourceChange,
    tagActionMode,
    onTagActionModeChange
}) => {
    return (
        <div className="mb-4">
            <KeywordSourceSelector 
                keywordSource={keywordSource}
                onKeywordSourceChange={onKeywordSourceChange}
            />

            <div className="mb-4">
                <FormLabel className="dark:text-slate-200">Tag Action</FormLabel>
                <div className="flex space-x-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio"
                            checked={tagActionMode === 'add'}
                            onChange={() => onTagActionModeChange('add')}
                        />
                        <span className="ml-2 dark:text-slate-200">Add Tags</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio"
                            checked={tagActionMode === 'delete'}
                            onChange={() => onTagActionModeChange('delete')}
                        />
                        <span className="ml-2 dark:text-slate-200">Remove Tags</span>
                    </label>
                </div>
            </div>

            <FormLabel className="dark:text-slate-200">
                {tagActionMode === 'add' ? 'Select Tags to Add' : 'Select Tags to Remove'}
            </FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-4 border rounded-lg dark:border-darkmode-400">
                {availableTags.map((tag) => (
                    <div 
                        key={tag.id}
                        className={clsx(
                            "flex items-center space-x-2 p-2 rounded transition-colors",
                            "hover:bg-slate-100 dark:hover:bg-darkmode-400",
                            selectedTags.includes(tag.id) && "bg-slate-100 dark:bg-darkmode-400"
                        )}
                    >
                        <label className="flex items-center space-x-2 cursor-pointer flex-1">
                            <input
                                type="checkbox"
                                checked={selectedTags.includes(tag.id)}
                                onChange={() => onTagSelection(tag.id)}
                                className="form-checkbox h-5 w-5 text-primary border-slate-300 rounded 
                                         dark:border-darkmode-400 dark:bg-darkmode-800"
                            />
                            <span className="dark:text-slate-200">{tag.name}</span>
                        </label>
                    </div>
                ))}
            </div>
            <div className="mt-2 text-slate-500 text-sm">
                {selectedTags.length} tags selected
            </div>
        </div>
    );
};

export default TagResponseForm; 
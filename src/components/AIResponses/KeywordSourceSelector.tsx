import React from 'react';
import { FormLabel } from "@/components/Base/Form";

interface KeywordSourceSelectorProps {
    keywordSource: 'user' | 'bot';
    onKeywordSourceChange: (source: 'user' | 'bot') => void;
}

const KeywordSourceSelector: React.FC<KeywordSourceSelectorProps> = ({
    keywordSource,
    onKeywordSourceChange
}) => {
    return (
        <div className="mb-3">
            <FormLabel className="dark:text-slate-200">Keyword Source</FormLabel>
            <div className="flex space-x-4">
                <label className="flex items-center cursor-pointer">
                    <input
                        type="radio"
                        name="keywordSource"
                        value="user"
                        checked={keywordSource === 'user'}
                        onChange={(e) => onKeywordSourceChange(e.target.value as 'user' | 'bot')}
                        className="form-radio text-primary"
                    />
                    <span className="ml-2 dark:text-slate-200">User Message</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input
                        type="radio"
                        name="keywordSource"
                        value="bot"
                        checked={keywordSource === 'bot'}
                        onChange={(e) => onKeywordSourceChange(e.target.value as 'user' | 'bot')}
                        className="form-radio text-primary"
                    />
                    <span className="ml-2 dark:text-slate-200">Bot Response</span>
                </label>
            </div>
        </div>
    );
};

export default KeywordSourceSelector; 
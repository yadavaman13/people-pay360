import SearchBar from '@/components/Shared/Form/SearchBar/SearchBar';
import {
    CONTRACT_SEARCH_PLACEHOLDER_PREFIX,
    CONTRACT_SEARCH_PLACEHOLDER_OPTIONS,
    CONTRACT_SEARCH_INTERVAL,
} from './contractSearch.constants';

/**
 * ContractSearchBar
 *
 * Modular search bar wrapper specifically configured for contract listings,
 * featuring an animated cycling placeholder.
 */
function ContractSearchBar({
    value = '',
    onChange,
    onClear,
    placeholder = 'Search contracts...',
    placeholderPrefix = CONTRACT_SEARCH_PLACEHOLDER_PREFIX,
    placeholderOptions = CONTRACT_SEARCH_PLACEHOLDER_OPTIONS,
    placeholderInterval = CONTRACT_SEARCH_INTERVAL,
    className = '',
    ...props
}) {
    return (
        <SearchBar
            value={value}
            onChange={onChange}
            onClear={onClear}
            placeholder={placeholder}
            placeholderPrefix={placeholderPrefix}
            placeholderOptions={placeholderOptions}
            placeholderInterval={placeholderInterval}
            className={`contract-search-bar ${className}`.trim()}
            {...props}
        />
    );
}

export default ContractSearchBar;

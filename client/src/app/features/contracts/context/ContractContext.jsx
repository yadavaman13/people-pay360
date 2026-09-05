import { createContext, useReducer } from 'react';

export const ContractContext = createContext(null);

const initialState = {
    contracts: [],
    selectedContract: null,
    pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
    },
    filters: {
        search: '',
        status: '',
        employeeId: '',
        page: 1,
        limit: 20,
    },
    loading: false,
    error: null,
};

export const CONTRACT_ACTIONS = {
    FETCH_START: 'FETCH_START',
    FETCH_SUCCESS: 'FETCH_SUCCESS',
    FETCH_ERROR: 'FETCH_ERROR',
    SET_SELECTED_CONTRACT: 'SET_SELECTED_CONTRACT',
    SET_FILTERS: 'SET_FILTERS',
    RESET_FILTERS: 'RESET_FILTERS',
    UPDATE_CONTRACT_IN_LIST: 'UPDATE_CONTRACT_IN_LIST',
    REMOVE_CONTRACT_FROM_LIST: 'REMOVE_CONTRACT_FROM_LIST',
};

function contractReducer(state, action) {
    switch (action.type) {
        case CONTRACT_ACTIONS.FETCH_START:
            return {
                ...state,
                loading: true,
                error: null,
            };
        case CONTRACT_ACTIONS.FETCH_SUCCESS:
            return {
                ...state,
                loading: false,
                contracts: action.payload.contracts || [],
                pagination: {
                    total: action.payload.total ?? 0,
                    page: action.payload.page ?? 1,
                    limit: action.payload.limit ?? 20,
                    totalPages: action.payload.totalPages ?? 0,
                },
                error: null,
            };
        case CONTRACT_ACTIONS.FETCH_ERROR:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case CONTRACT_ACTIONS.SET_SELECTED_CONTRACT:
            return {
                ...state,
                selectedContract: action.payload,
                loading: false,
                error: null,
            };
        case CONTRACT_ACTIONS.SET_FILTERS:
            return {
                ...state,
                filters: {
                    ...state.filters,
                    ...action.payload,
                },
            };
        case CONTRACT_ACTIONS.RESET_FILTERS:
            return {
                ...state,
                filters: {
                    search: '',
                    status: '',
                    employeeId: '',
                    page: 1,
                    limit: 20,
                },
            };
        case CONTRACT_ACTIONS.UPDATE_CONTRACT_IN_LIST: {
            const updated = action.payload;
            const nextContracts = state.contracts.map((c) => (c.id === updated.id ? updated : c));
            return {
                ...state,
                contracts: nextContracts,
                selectedContract:
                    state.selectedContract?.id === updated.id ? updated : state.selectedContract,
            };
        }
        case CONTRACT_ACTIONS.REMOVE_CONTRACT_FROM_LIST: {
            const idToRemove = action.payload;
            const nextContracts = state.contracts.filter((c) => c.id !== idToRemove);
            return {
                ...state,
                contracts: nextContracts,
                pagination: {
                    ...state.pagination,
                    total: Math.max(0, state.pagination.total - 1),
                },
                selectedContract:
                    state.selectedContract?.id === idToRemove ? null : state.selectedContract,
            };
        }
        default:
            return state;
    }
}

export function ContractProvider({ children }) {
    const [state, dispatch] = useReducer(contractReducer, initialState);

    return (
        <ContractContext.Provider value={{ ...state, dispatch }}>
            {children}
        </ContractContext.Provider>
    );
}

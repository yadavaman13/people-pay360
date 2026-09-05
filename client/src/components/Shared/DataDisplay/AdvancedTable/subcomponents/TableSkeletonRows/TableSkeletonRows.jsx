function TableSkeletonRows({
    dynamicSkeletonCount = 5,
    selectable = false,
    showSerialNumber = false,
    effectiveColumns = [],
}) {
    return (
        <>
            {Array.from({ length: dynamicSkeletonCount }).map((_, rIdx) => (
                <tr key={`skel-${rIdx}`} className="advanced-table-row advanced-table-skeleton-row">
                    {selectable && <td className="advanced-table-body-cell checkbox-cell"></td>}
                    {showSerialNumber && (
                        <td
                            className="advanced-table-body-cell serial-number-cell"
                            style={{ width: '56px', minWidth: '56px', maxWidth: '56px' }}
                        >
                            <div
                                className="skeleton-cell-bar"
                                style={{ width: '60%', margin: '0 auto' }}
                            />
                        </td>
                    )}
                    <td className="advanced-table-body-cell badge-column-cell"></td>
                    {effectiveColumns.map((col, cIdx) => {
                        if (typeof col.skeletonRender === 'function') {
                            return (
                                <td
                                    key={`skel-col-${col.key || cIdx}`}
                                    className="advanced-table-body-cell"
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    {col.skeletonRender(rIdx)}
                                </td>
                            );
                        }

                        // Employee column with avatar circle + 2 lines of text
                        if (col.key === 'employeeName' || col.key === 'employee') {
                            return (
                                <td
                                    key={`skel-col-${col.key || cIdx}`}
                                    className="advanced-table-body-cell"
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    <div className="skeleton-employee-cell">
                                        <div className="skeleton-avatar" />
                                        <div className="skeleton-employee-text">
                                            <div
                                                className="skeleton-cell-bar skeleton-title"
                                                style={{ width: `${95 + ((rIdx * 17) % 35)}px` }}
                                            />
                                            <div
                                                className="skeleton-cell-bar skeleton-subtitle"
                                                style={{ width: `${48 + ((rIdx * 11) % 25)}px` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            );
                        }

                        // Status badge column
                        if (col.key === 'status') {
                            return (
                                <td
                                    key={`skel-col-${col.key || cIdx}`}
                                    className="advanced-table-body-cell"
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    <div className="skeleton-badge-pill" />
                                </td>
                            );
                        }

                        // Action buttons column
                        if (col.key === 'actions' || col.key === 'action') {
                            return (
                                <td
                                    key={`skel-col-${col.key || cIdx}`}
                                    className="advanced-table-body-cell"
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    <div className="skeleton-action-icon" />
                                </td>
                            );
                        }

                        // Dynamic width based on column key
                        const barWidth =
                            col.key === 'wage' || col.key === 'wageFormatted'
                                ? `${85 + ((rIdx * 11) % 25)}px`
                                : col.key === 'periodString' || col.key === 'period'
                                  ? `${115 + ((rIdx * 13) % 30)}px`
                                  : `${((cIdx * 19 + rIdx * 29 + 37) % 35) + 50}%`;

                        return (
                            <td
                                key={`skel-col-${col.key || cIdx}`}
                                className="advanced-table-body-cell"
                                style={col.width ? { width: col.width } : undefined}
                            >
                                <div className="skeleton-cell-bar" style={{ width: barWidth }} />
                            </td>
                        );
                    })}
                </tr>
            ))}
        </>
    );
}

export default TableSkeletonRows;

import React, { useMemo } from "react";

import {
    Table,
    TableHeader,
    TableBody,
    TableVariant,
    cellWidth,
} from "@patternfly/react-table";

import { Button } from "@patternfly/react-core";
import { TriggerLink } from "../Trigger/TriggerLink";
import { ErrorConnection } from "../Errors/ErrorConnection";
import { Preloader } from "../Preloader/Preloader";
import { ForgeIcon } from "../Forge/ForgeIcon";
import { StatusLabel } from "../StatusLabel/StatusLabel";
import { Timestamp } from "../utils/time";
import { useInfiniteQuery } from "react-query";

// Add every target to the chroots column and color code according to status
const ChrootStatuses = (props) => {
    let labels = [];

    for (let chroot in props.ids) {
        const id = props.ids[chroot];
        const status = props.statuses[chroot];

        labels.push(
            <StatusLabel
                key={chroot}
                status={status}
                target={chroot}
                link={`/results/copr-builds/${id}`}
            />,
        );
    }

    return <div>{labels}</div>;
};

const CoprBuildsTable = () => {
    // Headings
    const columns = [
        {
            title: <span className="pf-u-screen-reader">Forge</span>,
            transforms: [cellWidth(5)],
        }, // space for forge icon
        { title: "Trigger", transforms: [cellWidth(15)] },
        { title: "Chroots", transforms: [cellWidth(60)] },
        { title: "Time Submitted", transforms: [cellWidth(10)] },
        { title: "Copr Build", transforms: [cellWidth(10)] },
    ];

    // Fetch data from dashboard backend (or if we want, directly from the API)
    const fetchData = ({ pageParam = 1 }) =>
        fetch(
            `${process.env.REACT_APP_API_URL}/copr-builds?page=${pageParam}&per_page=20`,
        )
            .then((response) => response.json())
            .then((data) => jsonToRow(data));

    const { isLoading, isError, fetchNextPage, data, isFetching } =
        useInfiniteQuery("copr", fetchData, {
            getNextPageParam: (_, allPages) => allPages.length + 1,
            keepPreviousData: true,
        });

    // Convert fetched json into row format that the table can read
    function jsonToRow(res) {
        let rowsList = [];

        res.forEach((copr_builds) => {
            let singleRow = {
                cells: [
                    {
                        title: <ForgeIcon url={copr_builds.project_url} />,
                    },
                    {
                        title: (
                            <strong>
                                <TriggerLink builds={copr_builds} />
                            </strong>
                        ),
                    },
                    {
                        title: (
                            <ChrootStatuses
                                statuses={copr_builds.status_per_chroot}
                                ids={copr_builds.packit_id_per_chroot}
                            />
                        ),
                    },
                    {
                        title: (
                            <Timestamp
                                stamp={copr_builds.build_submitted_time}
                            />
                        ),
                    },
                    {
                        title: (
                            <strong>
                                <a
                                    href={copr_builds.web_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {copr_builds.build_id}
                                </a>
                            </strong>
                        ),
                    },
                ],
            };
            rowsList.push(singleRow);
        });
        return rowsList;
    }

    // Create a memoization of all the data when we flatten it out. Ideally one should render all the pages separately so that rendering will be done faster
    const rows = useMemo(() => (data ? data.pages.flat() : []), [data]);

    // If backend API is down
    if (isError) {
        return <ErrorConnection />;
    }

    // Show preloader if waiting for API data
    // TODO(SpyTec): Replace with skeleton loader, we know the data will look like
    if (isLoading) {
        return <Preloader />;
    }

    return (
        <div>
            <Table
                aria-label="Copr builds"
                variant={TableVariant.compact}
                cells={columns}
                rows={rows}
            >
                <TableHeader />
                <TableBody />
            </Table>
            <center>
                <br />
                <Button
                    variant="control"
                    onClick={() => fetchNextPage()}
                    isAriaDisabled={isFetching}
                >
                    {isFetching ? "Fetching data" : "Load more"}
                </Button>
            </center>
        </div>
    );
};

export { CoprBuildsTable };
import fetch from 'node-fetch';

/** Generic class for making api calls */
export abstract class EndpointHandler
{
    /** Method used to retrieve the string endpoint to call */
    abstract getEndpoint(): string;
    /** Makes a GET Call to the endpoint and returns the json parsed body. */
    async getJson<T>(): Promise<T>{
        let endpoint = this.getEndpoint();
        console.log(endpoint);
        let response = await fetch(endpoint);
        let data = await response.json();
        console.log(data);
        return data;
    }
}

/** Type of Search Queries available */
export enum SearchType{
    /** Searches for query terms inside of a file. This method returns up to 100 results per page. */
    code,
    /** Find commits via various criteria on the default branch (usually main). This method returns up to 100 results per page. */
    commits,
    /** Find issues by state and keyword. This method returns up to 100 results per page. */
    issues,
    /** Find labels in a repository with names or descriptions that match search keywords. Returns up to 100 results per page. */
    labels,
    /** Find repositories via various criteria. This method returns up to 100 results per page. */
    repositories,
    /** Find topics via various criteria. Results are sorted by best match. This method returns up to 100 results per page. See "Searching topics" for a detailed list of qualifiers. */
    topics,
    /** Find users via various criteria. This method returns up to 100 results per page. */
    users,
}

type CodeSearchSorts = 'indexed';
type CommitSearchSorts = 'author-date' | 'comitter-date';
type IssuesSearchSorts = 'comments' | 'reactions' | 'reactions-+1' | 'reactions--1' | 'reactions-smile' | 'reactions-thinking_face' | 'reactions-heart' | 'reactions-tada' | 'interactions' | 'created' | 'updated';
type LabelsSearchSorts = 'created' | 'updated';
type RepositoriesSearchSorts = 'starts' | 'forks' | 'help-wanted-issues' | 'updated';
type UsersSearchSorts = 'followers' | 'repositories' | 'joined';

/** Execute Query on Github and return formatted results */
export class Search extends EndpointHandler{
    /** Type of objects to return with Query */
    type: SearchType;
    /** Generic String to match on in the results */
    query?: string | string[];
    /** Specific Tags/Topics to search for */
    topics?: string | string[];
    /** Specific Languages to search for */
    languages?: string | string[];
    /** Search the code in all repositories owned by a certain user */
    user?: string;
    /** Search the code in all repositories owned by a certain organization */
    org?: string;
    /** Search the code in a specific repository (USERNAME/REPOSITORY ie adragon202/rust-project-manager) */
    repo?: string;
    /** Mathces code files with a certain filename */
    filename?: string;
    /** Determines whether the first search results returned is the highest number of matches (desc) or the lowest number of matches (asc).
     *  This parameter is ignored unless you provide sort.
     */
    order?: 'asc' | 'desc';
    /** Sorts the results of your query by the specified field. Defaults to best match. */
    sort?: CodeSearchSorts | CommitSearchSorts | IssuesSearchSorts | LabelsSearchSorts | RepositoriesSearchSorts | UsersSearchSorts;
    /** Page number of the results to fetch */
    page?: number;
    /** The number of results per page (max 100, default 30) */
    perPage?: number;

    constructor(type: SearchType){
        super();
        this.type = type;
    }

    getEndpoint(): string{
        let endpoint = `https://api.github.com/search/${SearchType[this.type]}`;
        let params: string[] = [];
        //Assemble Query
        if (typeof(this.query) === 'string' || (Array.isArray(this.query) && this.query.length > 0)
            || typeof(this.topics) === 'string' || (Array.isArray(this.topics) && this.topics.length > 0)
            || typeof(this.languages) === 'string' || (Array.isArray(this.languages) && this.languages.length > 0)
            || typeof(this.user) === 'string' || typeof(this.org) === 'string' || typeof(this.repo) === 'string'
            || typeof(this.filename) === 'string')
        {
            let queries: string[] = [];
            if (typeof(this.query) === 'string') { queries.push(encodeURI(this.query)); }
            else if (Array.isArray(this.query) && this.query.length > 0) { queries.push(...this.query.map(q => encodeURI(q))); }
            if (typeof(this.user) === 'string') { queries.push('user:' + encodeURI(this.user)); }
            if (typeof(this.org) === 'string') { queries.push('org:' + encodeURI(this.org)); }
            if (typeof(this.repo) === 'string') { queries.push('repo:' + encodeURI(this.repo)); }
            if (typeof(this.filename) === 'string') { queries.push('filename:' + encodeURI(this.filename)); }
            if (typeof(this.topics) === 'string') { queries.push('topic:' + encodeURI(this.topics)); }
            else if (Array.isArray(this.topics) && this.topics.length > 0) { queries.push(...this.topics.map(q => 'topic:' + encodeURI(q))); }
            if (typeof(this.languages) === 'string') { queries.push('language:' + encodeURI(this.languages)); }
            else if (Array.isArray(this.languages) && this.languages.length > 0) { queries.push(...this.languages.map(q => 'language:' + encodeURI(q))); }
            params.push(`q=${queries.join('+')}`);
        }
        //Assemble Pagination and Sorting Parameters
        if (this.sort) { params.push(`sort=${this.sort}`); }
        if (this.order) { params.push(`order=${this.order}`); }
        if (this.page) { params.push(`page=${this.page}`); }
        if (this.perPage) { params.push(`per_page=${this.perPage}`); }
        //Consolidate Parameters
        if (params.length > 0) {endpoint += '?' + params.join('&'); }
        return endpoint;
    }

    async search<T extends Repository | User | RepositoryFile>(): Promise<SearchResults<T>>{
        return this.getJson<SearchResults<T>>();
    }
}

/** Results of Search Command */
export interface SearchResults<T extends Repository | User | RepositoryFile>{
    /** Total Results excluding those included */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    total_count: number;
    /** Flag indicating if the results returned includes all found results */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    incomplete_results: boolean;
    /** Results of Search */
    items: T[];
}//end export interface SearchResults<T>

export interface Repository{
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    owner: User;
    private: boolean;
    html_url: string;
    description: string;
    fork: boolean;
    url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    homepage: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    forks_count: number;
    open_issues_count: number;
    master_branch: string;
    default_branch: string;
    score: number;
    archive_url: string;
    assignees_url: string;
    blobs_url: string;
    branches_url: string;
    collaborators_url: string;
    comments_url: string;
    commits_url: string;
    compare_url: string;
    contents_url: string;
    contributors_url: string;
    deployments_url: string;
    downloads_url: string;
    events_url: string;
    forks_url: string;
    git_commits_url: string;
    git_refs_url: string;
    git_tags_url: string;
    git_url: string;
    issue_comment_url: string;
    issue_events_url: string;
    issues_url: string;
    keys_url: string;
    labels_url: string;
    languages_url: string;
    merges_url: string;
    milestones_url: string;
    notifications_url: string;
    pulls_url: string;
    releases_url: string;
    ssh_url: string;
    stargazers_url: string;
    statuses_url: string;
    subscribers_url: string;
    subscription_url: string;
    tags_url: string;
    teams_url: string;
    trees_url: string;
    clone_url: string;
    mirror_url: string;
    hooks_url: string;
    svn_url: string;
    forks: number;
    open_issues: number;
    watchers: number;
    has_issues: boolean;
    has_projects: boolean;
    has_pages: boolean;
    has_wiki: boolean;
    has_downloads: boolean;
    archived: boolean;
    disabled: boolean;
    visibility: string;
    license: RepositoryLicense
}

export interface User{
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    received_events_url: string;
    type: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    site_admin: boolean;
}

export interface RepositoryLicense{
    key: string;
    name: string;
    url: string;
    spdx_id: string;
    node_id: string;
    html_url: string;
}

export interface RepositoryFile
{
  name: string,
  path: string,
  sha: string,
  url: string,
  git_url: string,
  html_url: string,
  repository: Repository,
  score: number
}
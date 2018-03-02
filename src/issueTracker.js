import Observer from './observer.js'
import GithubDataStore from './githubDataStore.js'
import GithubMonitor from './githubMonitor.js'
import {filter} from './filter.js'

class IssueTracker {
    constructor(config) {
        this.config = config;
    }

    _mergeState(originData, latestData) {
        originData = originData || {};
        var result = {};
        for (let i = 0; i < latestData.length; i++) {
            const data = latestData[i];
            var id = data.number;
            var origin = originData[id] || {};
            result[id] = Object.assign(origin, {
                url: data.html_url,
                title: data.title,
                type: data.pull_request ? 'pr' : 'issue',
                labels: data.labels.map((x) => { return x.name })
            })
            if (originData[id]) {
                delete originData[id];
            }
        }
        return [result, originData];
    }

    async displayItems(dicts) {
        var observer = this.observer;
        var monitor = new GithubMonitor(this.config.monitor);
        var keys = Object.keys(dicts);
        for (let i = 0; i < keys.length; i++) {
            var key  = keys[i];
            var item = dicts[key];
            // details should contains: issueId, projectId, title, rawUrl, comment, labels, assign
            var details = filter(key, item, observer);
            dicts[key]['projectId'] = await monitor.createOrUpdateItem(details);
        }
        return dicts;
    }

    async closeUnnecessaryItems(datas) {}

    async process() {
        // 1. init github repos
        var dataStore = new GithubDataStore(this.config.dataStore);
        var originDataTask = dataStore.load();
        // 2. sync issues from origin repo
        this.observer = new Observer(this.config.observer);
        var apiData = await this.observer.getLatestData();
        // 3. merge new data and origin data
        var originData = await originDataTask;
        var [mergedData, restData] = this._mergeState(originData, apiData);
        // 4. triage issues and prs
        var mergedDataTask = this.displayItems(mergedData);
        // 5. close restData
        this.closeUnnecessaryItems(restData);
        // 6. save the latest data
        mergedData = await mergedDataTask;
        dataStore.save(mergedData);
    }
}

export default IssueTracker;
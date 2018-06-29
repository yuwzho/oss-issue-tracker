import Github from './github.js';

class Observer {
    constructor(config) {
        this.config = Object.assign({
            repo: '',
            labels: []
        }, config);
        this.repo = Github.parseRepoUrl(this.config.repo);
        if (this.config.credential_name) {
            var credential = process.env[this.config.credential_name];
            if (!credential) {
                panic('cannot load environment variable ${' + this.config.credential_name + '}');
            }
            this.github = new Github(credential);
        }else{
            this.github = new Github();
        }
    }

    async getLatestData() {
        var labelQuery = '';
        for (var i = 0; i < this.config.labels.length; i++) {
            labelQuery += 'label:' + this.config.labels[i] + '+';
        }

        if (labelQuery === '') {
            console.warn('You don\'t specific any labels, this will sync all the issues.');
        }

        var query = labelQuery + 'is:open+repo:' + this.repo.user + '/' + this.repo.name;
        var result = [];
        var total = 2, perPage = 100;
        for (var page = 1; page < total; page++) { /* github search is 1 index */
            var searchResult = await this.github.search(query, page, perPage);
            total = searchResult.total_count / perPage + 1;
            result = result.concat(searchResult.items);
        }
        return result;
    }

    async getTimeline(id) {
        return await this.github.getEventsTimeline(this.config.repo, id);
    }
}

export default Observer;

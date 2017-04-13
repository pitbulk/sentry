import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import {Link} from 'react-router';

import ApiMixin from '../mixins/apiMixin';
import LoadingError from '../components/loadingError';
import LoadingIndicator from '../components/loadingIndicator';
import RepositoryFileSummary from '../components/repositoryFileSummary';
import ReleaseProjectStatSparkline from '../components/releaseProjectStatSparkline';
import {getShortVersion} from '../utils';

export default React.createClass({
  propTypes: {
    orgId: React.PropTypes.string.isRequired,
    projectId: React.PropTypes.string.isRequired,
    version: React.PropTypes.string.isRequired,
  },

  mixins: [ApiMixin],

  getInitialState() {
    return {
      isModalOpen: false,
      loading: true,
      error: false,
      dataFetchSent: false,
      data: null,
      fileList: null,
    };
  },

  componentWillMount() {
    this.fetchData();
  },

  optimisticallyFetchData() {
    if (this.state.dataFetchSent)
      return;

    this.setState({dataFetchSent: true});

    this.getDetails();
    this.getCommits();
  },

  getDetails() {
    let {orgId, version} = this.props;
    let path = `/organizations/${orgId}/releases/${encodeURIComponent(version)}/`;
    this.api.request(path, {
      success: (data, _, jqXHR) => {
        this.setState({
          error: false,
          loading: false,
          data: data,
        });
      },
      error: () => {
        this.setState({
          error: true,
          loading: false
        });
      }
    });
  },

  getCommits() {
    let {orgId, version} = this.props;
    let path = `/organizations/${orgId}/releases/${encodeURIComponent(version)}/commitfiles/`;
    this.api.request(path, {
      method: 'GET',
      success: (data, _, jqXHR) => {
        this.setState({
          fileList: data,
        });
      },
      error: () => {
        this.setState({
          error: true,
        });
      }
    });
  },

  onOpen() {
    this.setState({isModalOpen: true}, this.optimisticallyFetchData);
  },

  onClose() {
    this.setState({isModalOpen: false});
  },

  renderModal() {
    return (
      <Modal show={this.state.isModalOpen} onHide={this.onClose} animation={false}>
        <div className="modal-body">
          {this.renderModalBody()}
        </div>
      </Modal>
    );
  },

  renderEmpty() {
    return <div className="box empty">None</div>;
  },

  renderModalBody() {
    if (this.state.loading || this.state.fileList === null)
      return <LoadingIndicator />;
    else if (this.state.error)
      return <LoadingError onRetry={this.fetchData} />;

    let {orgId, projectId, version} = this.props;
    let shortVersion = getShortVersion(version);
    let {data, fileList} = this.state;

    let filesByRepository = fileList.reduce(function (fbr, file) {
      let {filename, repoName, author, type} = file;
      if (!fbr.hasOwnProperty(repoName)) {
        fbr[repoName] = {};
      }
      if (!fbr[repoName].hasOwnProperty(filename)) {
          fbr[repoName][filename] = {
          authors: {}, types: new Set(), repos: new Set(),
        };
      }

      fbr[repoName][filename].authors[author.email] = author;
      fbr[repoName][filename].types.add(type);

      return fbr;
    }, {});

    return (
      <div>
        <div className="user-details-header">
          <div className="user-name">
            <h5>{shortVersion}</h5>
          </div>
          <div className="user-action">
            <Link to={`/${orgId}/${projectId}/releases/${encodeURIComponent(version)}/`} className="btn btn-default">
              Details
            </Link>
          </div>
          <div className="clearfix" />
        </div>
        <div className="row">
          <div className="col-md-7">
            <div>
              {Object.keys(filesByRepository).map(repository => {
                return (<RepositoryFileSummary
                          repository={repository}
                          fileChangeSummary={filesByRepository[repository]}/>);
              })}
            </div>
          </div>
          <div className="col-md-5">
            <h6 className="nav-header m-b-1">Projects Affected</h6>
            <ul className="nav nav-stacked">
              {data.projects.map((project) => {
                return (
                  <ReleaseProjectStatSparkline
                    key={project.id}
                    orgId={orgId}
                    project={project}
                    version={version}
                  />
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  },

  render() {
    let {version} = this.props;
    let shortVersion = getShortVersion(version);
    return (
      <a onClick={this.onOpen}>
        <span title={version}>{shortVersion}</span>
        {this.renderModal()}
      </a>
    );
  },
});
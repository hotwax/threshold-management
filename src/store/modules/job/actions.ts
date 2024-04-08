import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { getResponseError, hasError, showToast } from '@/utils'
import { JobService } from '@/services/JobService'
import { translate } from '@hotwax/dxp-components'
import { DateTime } from 'luxon';
import logger from "@/logger";

const actions: ActionTree<JobState, RootState> = {
  async fetchJobDescription({ commit, state }, payload){
    const enumIds = [] as any;
    const cachedEnumIds = Object.keys(state.enumIds);
    payload.map((id: any) => {
      if(!cachedEnumIds.includes(id) && id){
        enumIds.push(id);
      }
    });
    if(enumIds.length <= 0) return enumIds.map((id: any) => state.enumIds[id]);

    const resp = await JobService.fetchJobDescription({
      "inputFields": {
        "enumId": enumIds,
        "enumId_op": "in"
      },
      "fieldList": ['enumId', 'description', 'enumName'],
      "entityName": "Enumeration",
      "noConditionFind": "Y",
      "viewSize": payload.length
    })
    if (resp.status === 200 && resp.data?.count > 0 && !hasError(resp)) {
      const enumInformation = resp.data.docs;
      if (resp.data.docs) {
        commit(types.JOB_DESCRIPTION_UPDATED, enumInformation);
      }
    }
    return resp;
  },

  async fetchJobHistory({ commit, dispatch, state }, payload){ 
    await JobService.fetchJobInformation({
      "inputFields": {
        "systemJobEnumId_fld0_value": payload.jobEnums[0],
        "systemJobEnumId_fld0_grp": "1",
        "systemJobEnumId_fld0_op": "equals",
        "systemJobEnumId_fld1_value": payload.jobEnums[1],
        "systemJobEnumId_fld1_grp": "2",
        "systemJobEnumId_fld1_op": "equals",
        "productStoreId": this.state.user.currentEComStore.productStoreId,
        "productStoreId_grp": "2",
        "statusId": ["SERVICE_CANCELLED", "SERVICE_CRASHED", "SERVICE_FAILED", "SERVICE_FINISHED"],
        "statusId_op": "in",
        "systemJobEnumId_op": "not-empty"
      },
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "cancelDateTime", "finishDateTime", "startDateTime", "runtimeDataId" ],
      "entityName": "JobSandbox",
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
      "orderBy": "runTime DESC"
    }).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs;
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.history.list.concat(resp.data.docs);
          }
          jobs.map((job: any) => {
            job['statusDesc'] = this.state.util.statusDesc[job.statusId];
          })          
          commit(types.JOB_HISTORY_UPDATED, { jobs, total });
          const tempExprList = [] as any;
          const enumIds = [] as any;
          const searchPreferenceIds = [] as any;
          resp.data.docs.map((item: any) => {
            enumIds.push(item.systemJobEnumId);
            tempExprList.push(item.tempExprId);
            if (item.runtimeData && item.runtimeData.searchPreferenceId) searchPreferenceIds.push(item.runtimeData.searchPreferenceId)
          })
          const tempExpr = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', tempExpr);
          dispatch('fetchJobDescription', enumIds);
          dispatch('fetchThresholdRules', [...new Set(searchPreferenceIds)])
        }
      } else {
        commit(types.JOB_HISTORY_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_HISTORY_UPDATED, { jobs: [], total: 0 });
      logger.error(err);
      showToast(translate("Something went wrong"), err);
    }) 
  },

  async fetchRunningJobs({ commit, dispatch, state }, payload){
    await JobService.fetchJobInformation({
      "inputFields": {
        "systemJobEnumId_fld0_value": payload.jobEnums[0],
        "systemJobEnumId_fld0_grp": "1",
        "systemJobEnumId_fld0_op": "equals",
        "systemJobEnumId_fld1_value": payload.jobEnums[1],
        "systemJobEnumId_fld1_grp": "2",
        "systemJobEnumId_fld1_op": "equals",
        "productStoreId": this.state.user.currentEComStore.productStoreId,
        "productStoreId_grp": "2",
        "statusId": ["SERVICE_RUNNING", "SERVICE_QUEUED"],
        "statusId_op": "in",
        "systemJobEnumId_op": "not-empty",
      },
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "runtimeDataId" ],
      "entityName": "JobSandbox",
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
      "orderBy": "runTime DESC"
    }).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs;
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.running.list.concat(resp.data.docs);
          }
          jobs.map((job: any) => {
            job['statusDesc'] = this.state.util.statusDesc[job.statusId];
          })
          commit(types.JOB_RUNNING_UPDATED, { jobs, total });
          const tempExprList = [] as any;
          const enumIds = [] as any;
          const searchPreferenceIds = [] as any;
          resp.data.docs.map((item: any) => {
            enumIds.push(item.systemJobEnumId);
            tempExprList.push(item.tempExprId);
            if (item.runtimeData && item.runtimeData.searchPreferenceId) searchPreferenceIds.push(item.runtimeData.searchPreferenceId)
          })
          const tempExpr = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', tempExpr);
          dispatch('fetchJobDescription', enumIds);
          dispatch('fetchThresholdRules', [...new Set(searchPreferenceIds)])
        }
      } else {
        commit(types.JOB_RUNNING_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_RUNNING_UPDATED, { jobs: [], total: 0 });
      logger.error(err);
      showToast(translate("Something went wrong"), err);
    }) 
  },

  async fetchPendingJobs({ commit, dispatch, state }, payload){
    await JobService.fetchJobInformation({
      "inputFields": {
        "systemJobEnumId_fld0_value": payload.jobEnums[0],
        "systemJobEnumId_fld0_grp": "1",
        "systemJobEnumId_fld0_op": "equals",
        "systemJobEnumId_fld1_value": payload.jobEnums[1],
        "systemJobEnumId_fld1_grp": "2",
        "systemJobEnumId_fld1_op": "equals",
        "productStoreId": this.state.user.currentEComStore.productStoreId,
        "productStoreId_grp": "2",
        "statusId": "SERVICE_PENDING",
        "systemJobEnumId_op": "not-empty"
      },
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId", "runtimeDataId", "productStoreId" ],
      "entityName": "JobSandbox",
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
      "orderBy": "runTime ASC"
    }).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs;
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.pending.list.concat(resp.data.docs);
          }
          
          commit(types.JOB_PENDING_UPDATED, { jobs, total });
          const tempExprList = [] as any;
          const enumIds = [] as any;
          const searchPreferenceIds = [] as any;
          resp.data.docs.map((item: any) => {
            enumIds.push(item.systemJobEnumId);
            tempExprList.push(item.tempExprId);
            if (item.runtimeData && item.runtimeData.searchPreferenceId) searchPreferenceIds.push(item.runtimeData.searchPreferenceId)
          })
          const tempExpr = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', tempExpr);
          dispatch('fetchJobDescription', enumIds);
          dispatch('fetchThresholdRules', [...new Set(searchPreferenceIds)])
        }
      } else {
        commit(types.JOB_PENDING_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_PENDING_UPDATED, { jobs: [], total: 0 });
      logger.error(err);
      showToast(translate("Something went wrong"), err);
    })
  },
  async fetchTemporalExpression({ state, commit }, tempExprIds){
    const tempIds = [] as any;
    const cachedTempExprId = Object.keys(state.temporalExp);
    tempExprIds.map((id: any) => {
      if(!cachedTempExprId.includes(id) && id){
        tempIds.push(id);
      }
    });
    if(tempIds.length <= 0) return tempExprIds.map((id: any) => state.temporalExp[id]);
    
    const resp = await JobService.fetchTemporalExpression({
        "inputFields": {
        "tempExprId": tempIds,
        "temoExprId_op": "in"
      },
      "viewSize": tempIds.length,
      "fieldList": [ "tempExprId", "description","integer1", "integer2" ],
      "entityName": "TemporalExpression",
      "noConditionFind": "Y",
    })
    if (resp.status === 200 && !hasError(resp)) {
      commit(types.JOB_TEMPORAL_EXPRESSION_UPDATED, resp.data.docs);
    }
    return resp;
  },
  async fetchThresholdRules({ state, commit }, thresholdRuleIds){
    const tempIds = [] as any;
    const cachedThresholdRuleIds = Object.keys(state.thresholdRules);
    thresholdRuleIds.map((id: any) => {
      if(!cachedThresholdRuleIds.includes(id) && id){
        tempIds.push(id);
      }
    });
    if(tempIds.length <= 0) return thresholdRuleIds.map((id: any) => state.temporalExp[id]);
    try {
      const resp = await JobService.fetchThresholdRules({
        "inputFields": {
          "searchPrefId": tempIds,
          "searchPrefId_op": "in"
        },
        "viewSize": tempIds.length,
        "fieldList": [ "searchPrefId", "searchPrefValue"],
        "entityName": "SearchPreference",
        "noConditionFind": "Y",
      })
      if (resp.status === 200 && !hasError(resp)) {
        commit(types.JOB_THRESHOLD_RULES_UPDATED, resp.data.docs);
      }
      return resp;
    } catch(err: any){
      logger.error(err);
      return Promise.reject(new Error(err))
    }
  },

  removeThresholdRule({ commit }, id){
    commit(types.JOB_THRESHOLD_RULE_REMOVED, id);
  },

  clearJobState({commit}) {
    commit(types.JOB_PENDING_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_HISTORY_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_RUNNING_UPDATED, {jobs: [], total: 0});
  },

  async skipJob({ getters }, job) {
    let skipTime = {};
    const integer1 = getters['getTemporalExpr'](job.tempExprId).integer1;
    const integer2 = getters['getTemporalExpr'](job.tempExprId).integer2
    if(integer1 === 12) {
      skipTime = { minutes: integer2 }
    } else if (integer1 === 10) {
      skipTime = { hours: integer2 }
    } else if (integer1 === 5) {
      skipTime = { days: integer2 }
    } else {
      showToast(translate("This job schedule cannot be skipped"));
      return;
    }
    const time = DateTime.fromMillis(job.runTime).diff(DateTime.local()).plus(skipTime);
    const updatedRunTime = time.toMillis() + DateTime.local().toMillis()
    const payload = {
      'jobId': job.jobId,
      'runTime': updatedRunTime,
      'systemJobEnumId': job.systemJobEnumId,
      'recurrenceTimeZone': this.state.user.current.userTimeZone,
      'statusId': "SERVICE_PENDING"
    } as any

    const resp = await JobService.updateJob(payload)
    if (resp.status === 200 && !hasError(resp) && resp.data.successMessage) {
      // TODO: improve the condition to store the current job in state.
      // returning the updated runTime on success as, the job configuration component does not get updated when
      // skipping a job from there.
      return { updatedRunTime: payload.runTime }
    }
    return resp;
  },

  async cancelJob({ dispatch }, job) {
    let resp;

    try {
      resp = await JobService.updateJob({
        jobId: job.jobId,
        systemJobEnumId: job.systemJobEnumId,
        statusId: "SERVICE_CANCELLED",
        recurrenceTimeZone: this.state.user.current.userTimeZone,
        cancelDateTime: DateTime.now().toMillis()
      });
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate('Service updated successfully'))
      } else {
        showToast(translate('Something went wrong'), getResponseError(resp))
      }
    } catch (err) {
      showToast(translate('Something went wrong'), err)
      logger.error(err)
      // TODO: explore around handling error, so that we can directly access the response status code
      // This is returned so that response is handled in catch instead of then
      // err is string and when trying to access status it gives error
      return Promise.reject(err)
    }
    return resp;
  },
}
export default actions;
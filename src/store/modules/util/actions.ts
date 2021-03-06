import { UtilService } from '@/services/UtilService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { hasError } from '@/utils'

const actions: ActionTree<UtilState, RootState> = {
  /**
   * Status Description
   */
  async getServiceStatusDesc ({ commit }) {
    try{
      const resp = await UtilService.getServiceStatusDesc({
        "inputFields": {
          "statusTypeId": "SERVICE_STATUS",
          "statusTypeId_op": "equals"
        },
        "entityName": "StatusItem",
        "fieldList": ["statusId", "description"],
        "noConditionFind": "Y",
        "viewSize": 20
      }) 
      if (resp.status === 200 && !hasError(resp) && resp.data.count) {
        commit(types.UTIL_SERVICE_STATUS_DESC_UPDATED, resp.data.docs);
      }
    } catch(err) {
      console.error(err)
    }
  },

  async getShopifyConfig({ commit }, payload) {
    // TODO: for now passing view size as 1 by considering that one product store id is associated with only
    // one shopify config
    const resp = await UtilService.getShopifyConfig({
      "inputFields": {
        "productStoreId": payload
      },
      "entityName": "ShopifyConfig",
      "distinct": "Y",
      "noConditionFind": "Y",
      "fieldList": ["shopifyConfigId", "productStoreId"],
      "viewSize": 1
    })

    if (resp.status === 200 && !hasError(resp) && resp?.data?.docs?.length > 0) {
      commit(types.UTIL_SHOPIFY_CONFIG_UPDATED, resp.data.docs?.length > 0 ? resp.data.docs[0] : {});
      return resp.data.docs[0];
    }
    return {};
  },

  async fetchFacilitiesByProductStore({ commit }, payload) {

    try {
      const resp = await UtilService.fetchFacilitiesByProductStore(payload);

      if (resp.status === 200 && !hasError(resp) && resp.data?.count > 0) {
        const facilities = resp.data.docs.reduce((facilities: any, data: any) => {
          if(!facilities[data.productStoreId]) {
            facilities[data.productStoreId] = []
          }

          facilities[data.productStoreId].push(data.facilityId)
          return facilities
        }, {})
        commit(types.UTIL_PRODUCT_STORE_FACILITY_UPDATED, facilities);
        return facilities;
      }
    } catch (err) {
      console.error(err)
    }
    return {};
  },
}

export default actions;
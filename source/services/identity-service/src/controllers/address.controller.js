export function createAddressController(addressService) {
  return {
    async list(req, res, next) {
      try {
        const data = await addressService.list(
          req.context.userId
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await addressService.create(
          req.context.userId,
          req.body
        );

        res.status(201).json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const data = await addressService.update(
          req.context.userId,
          req.params.id,
          req.body
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async remove(req, res, next) {
      try {
        const data = await addressService.remove(
          req.context.userId,
          req.params.id
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async setDefault(req, res, next) {
      try {
        const data = await addressService.setDefault(
          req.context.userId,
          req.params.id
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
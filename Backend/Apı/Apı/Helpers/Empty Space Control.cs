namespace Apı.Helpers.Empty_Space_Control
{
    public class Empty_Space_Control
    {
        public static string BoşKontrol<T>(T model)
        {
            if (model == null)
            {
                return "Gönderilen veriler boş";
            }

            var properties = typeof(T).GetProperties();

            foreach (var property in properties)
            {
                if (property.PropertyType == typeof(string))
                {
                    var value = property.GetValue(model)?.ToString();

                    if (string.IsNullOrWhiteSpace(value))
                    {
                        return $"{property.Name} alanı boş bırakılamaz.";
                    }
                }
            }

            return null;
        }
    }
}